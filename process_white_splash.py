import cv2
import numpy as np
import subprocess
import os
import shutil
import imageio_ffmpeg
import time

t0 = time.time()
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
src_video = r'frontend/src/assets/images/splash screen.mp4'

if not os.path.exists(src_video):
    raise FileNotFoundError(f"Source video not found: {src_video}")

cap = cv2.VideoCapture(src_video)
fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

print(f"Source Video: {w}x{h} @ {fps}fps, {total_frames} frames", flush=True)

os.makedirs('frontend/public', exist_ok=True)
out_mp4 = 'frontend/public/splash_screen.mp4'

# FFMPEG MP4 H.264 (clean background, pure white #FFFFFF, no watermark)
mp4_cmd = [
    ffmpeg_exe, "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{w}x{h}",
    "-pix_fmt", "bgr24",
    "-r", str(fps),
    "-i", "-",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    out_mp4
]

# Use DEVNULL to prevent OS pipe buffer deadlocks
proc_mp4 = subprocess.Popen(mp4_cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Coordinate grids and background fitting matrices
Y, X = np.mgrid[:h, :w]
bg_mask = np.ones((h, w), dtype=bool)
bg_mask[210:560, 220:1040] = False
bg_mask[530:, 1080:] = False

x_pts = X[bg_mask].flatten()
y_pts = Y[bg_mask].flatten()

# Feature matrix for quadratic + cubic surface fit
A = np.column_stack([
    np.ones_like(x_pts), x_pts, y_pts,
    x_pts**2, y_pts**2, x_pts*y_pts,
    x_pts**3, y_pts**3, x_pts**2*y_pts, x_pts*y_pts**2
])

# Precompute pseudo-inverse once for lightning-fast dot product solves
pinv_A = np.linalg.pinv(A)

A_all = np.column_stack([
    np.ones_like(X.flatten()), X.flatten(), Y.flatten(),
    X.flatten()**2, Y.flatten()**2, X.flatten()*Y.flatten(),
    X.flatten()**3, Y.flatten()**3, X.flatten()**2*Y.flatten(), X.flatten()*Y.flatten()**2
])

logo_region = np.zeros((h, w), dtype=bool)
logo_region[215:550, 225:1030] = True

gem_mask = np.zeros((h, w), dtype=np.uint8)
gem_mask[535:, 1085:] = 255

print("Processing frames to pure white splash_screen.mp4...", flush=True)
frame_idx = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Vectorized fast solve for background lighting per channel
    bg_fitted = np.zeros_like(frame, dtype=np.float64)
    for c in range(3):
        z_pts = frame[:, :, c][bg_mask].flatten()
        coeffs = pinv_A.dot(z_pts)
        bg_fitted[:, :, c] = A_all.dot(coeffs).reshape(h, w)

    # Difference from background model
    diff = np.linalg.norm(frame.astype(np.float64) - bg_fitted, axis=2)
    diff[~logo_region] = 0.0

    # Smooth alpha extraction
    alpha = np.clip((diff - 7.0) / (22.0 - 7.0), 0.0, 1.0)
    alpha[gem_mask > 0] = 0.0
    alpha_smooth = cv2.GaussianBlur(alpha, (3, 3), 0)
    alpha_smooth[~logo_region] = 0.0

    # Unmixed pure white composite for MP4: C = I + (1 - alpha) * (W - B)
    alpha_3d = np.repeat(alpha_smooth[:, :, np.newaxis], 3, axis=2)
    W = 255.0
    white_composite = frame.astype(np.float64) + (1.0 - alpha_3d) * (W - bg_fitted)
    white_composite = np.clip(white_composite, 0.0, 255.0).astype(np.uint8)
    white_composite[alpha_smooth == 0] = 255
    white_composite[gem_mask > 0] = 255

    proc_mp4.stdin.write(white_composite.tobytes())

    frame_idx += 1
    if frame_idx % 40 == 0 or frame_idx == total_frames:
        print(f"Processed {frame_idx}/{total_frames} frames...", flush=True)

cap.release()

proc_mp4.stdin.close()
proc_mp4.wait()

print(f"MP4 return code: {proc_mp4.returncode}", flush=True)
if proc_mp4.returncode == 0:
    print(f"splash_screen.mp4 generated! Size: {os.path.getsize(out_mp4) / 1024 / 1024:.2f} MB", flush=True)

# Copy to dist and assets
for dest_dir in ['frontend/dist', 'frontend/src/assets/images']:
    if os.path.exists(dest_dir):
        shutil.copy2(out_mp4, os.path.join(dest_dir, 'splash_screen.mp4'))
        print(f"Copied updated video assets to {dest_dir}", flush=True)

print(f"All processing completed in {time.time() - t0:.2f} seconds!", flush=True)
