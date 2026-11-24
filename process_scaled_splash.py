import cv2
import numpy as np
import subprocess
import os
import shutil
import imageio_ffmpeg
import time

t0 = time.time()
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
src_video = r'frontend/src/assets/images/splash screen vid.mp4'

if not os.path.exists(src_video):
    raise FileNotFoundError(f"Source video not found: {src_video}")

cap = cv2.VideoCapture(src_video)
fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

print(f"Source: {w}x{h} @ {fps}fps, {total_frames} frames", flush=True)

os.makedirs('frontend/public', exist_ok=True)
out_mp4 = 'frontend/public/splash_screen.mp4'

# FFMPEG MP4 H.264 visually lossless CRF 17, faststart enabled
mp4_cmd = [
    ffmpeg_exe, "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{w}x{h}",
    "-pix_fmt", "bgr24",
    "-r", str(fps),
    "-i", "-",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "17",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    out_mp4
]

proc_mp4 = subprocess.Popen(mp4_cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Scale factor: 67.5% (approx 65-70% requested)
scale = 0.675
cx, cy = 640.0, 360.0
M = cv2.getRotationMatrix2D((cx, cy), 0, scale)

# Precalculate alpha blend mask for affine warped region
ones = np.ones((h, w), dtype=np.float32)
warped_mask = cv2.warpAffine(ones, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
dist = cv2.distanceTransform((warped_mask > 0.99).astype(np.uint8), cv2.DIST_L2, 5)
blend_alpha = np.clip(dist / 32.0, 0.0, 1.0)
blend_alpha_3d = np.repeat(blend_alpha[:, :, np.newaxis], 3, axis=2)

# Background surface fitting setup
Y, X = np.mgrid[:h, :w]
bg_mask = np.ones((h, w), dtype=bool)
bg_mask[200:530, 240:1030] = False
bg_mask[550:, 1100:] = False

x_pts = X[bg_mask].flatten()
y_pts = Y[bg_mask].flatten()

A = np.column_stack([
    np.ones_like(x_pts), x_pts, y_pts,
    x_pts**2, y_pts**2, x_pts*y_pts,
    x_pts**3, y_pts**3, x_pts**2*y_pts, x_pts*y_pts**2
])
pinv_A = np.linalg.pinv(A)

A_all = np.column_stack([
    np.ones_like(X.flatten()), X.flatten(), Y.flatten(),
    X.flatten()**2, Y.flatten()**2, X.flatten()*Y.flatten(),
    X.flatten()**3, Y.flatten()**3, X.flatten()*Y.flatten(), X.flatten()*Y.flatten()**2
])

# Watermark inpainting mask
wm_mask = np.zeros((h, w), dtype=np.uint8)
wm_mask[570:630, 1130:1190] = 255
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
wm_mask_dilated = cv2.dilate(wm_mask, kernel)

print(f"Scaling logo group to {scale*100:.1f}% with pristine Lanczos4 filtering...", flush=True)
frame_idx = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # 1. Inpaint Gemini watermark on original frame
    cleaned = cv2.inpaint(frame, wm_mask_dilated, 4, cv2.INPAINT_NS)

    # 2. Fit smooth background lighting surface
    bg_fitted = np.zeros_like(cleaned, dtype=np.float64)
    for c in range(3):
        z_pts = cleaned[:, :, c][bg_mask].flatten()
        coeffs = pinv_A.dot(z_pts)
        bg_fitted[:, :, c] = A_all.dot(coeffs).reshape(h, w)
    bg_fitted = np.clip(bg_fitted, 0, 255)

    # 3. High quality Lanczos4 affine scaling
    scaled_img = cv2.warpAffine(
        cleaned, M, (w, h),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0)
    )

    # 4. Smooth composite onto seamless extended background
    final_frame = (scaled_img.astype(float) * blend_alpha_3d + bg_fitted * (1.0 - blend_alpha_3d)).astype(np.uint8)

    proc_mp4.stdin.write(final_frame.tobytes())

    frame_idx += 1
    if frame_idx % 40 == 0 or frame_idx == total_frames:
        print(f"Processed {frame_idx}/{total_frames} frames...", flush=True)

cap.release()

proc_mp4.stdin.close()
proc_mp4.wait()

print(f"FFmpeg exit code: {proc_mp4.returncode}", flush=True)
if proc_mp4.returncode == 0:
    size_mb = os.path.getsize(out_mp4) / 1024 / 1024
    print(f"Scaled splash screen video generated: {out_mp4} ({size_mb:.2f} MB)", flush=True)

# Copy to dist and assets
for dest_dir in ['frontend/dist', 'frontend/src/assets/images']:
    if os.path.exists(dest_dir):
        dest_file = os.path.join(dest_dir, 'splash_screen.mp4')
        shutil.copy2(out_mp4, dest_file)
        print(f"Synced to {dest_file}", flush=True)

print(f"Completed in {time.time() - t0:.2f} seconds!", flush=True)
