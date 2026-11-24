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

# FFMPEG MP4 H.264 visually lossless CRF 17, slow preset for pristine quality
mp4_cmd = [
    ffmpeg_exe, "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{w}x{h}",
    "-pix_fmt", "bgr24",
    "-r", str(fps),
    "-i", "-",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "17",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    out_mp4
]

proc_mp4 = subprocess.Popen(mp4_cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Inpainting mask for Gemini watermark at bottom right (y: 570..630, x: 1130..1190)
mask = np.zeros((h, w), dtype=np.uint8)
mask[570:630, 1130:1190] = 255
# Smooth boundary expansion
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
mask_dilated = cv2.dilate(mask, kernel)

print("Inpainting Gemini branding and exporting at highest quality...", flush=True)
frame_idx = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Reconstruct background naturally with Navier-Stokes inpainting
    cleaned = cv2.inpaint(frame, mask_dilated, 4, cv2.INPAINT_NS)

    proc_mp4.stdin.write(cleaned.tobytes())

    frame_idx += 1
    if frame_idx % 40 == 0 or frame_idx == total_frames:
        print(f"Processed {frame_idx}/{total_frames} frames...", flush=True)

cap.release()

proc_mp4.stdin.close()
proc_mp4.wait()

print(f"FFmpeg exit code: {proc_mp4.returncode}", flush=True)
if proc_mp4.returncode == 0:
    size_mb = os.path.getsize(out_mp4) / 1024 / 1024
    print(f"Cleaned video generated successfully: {out_mp4} ({size_mb:.2f} MB)", flush=True)

# Copy to dist and assets
for dest_dir in ['frontend/dist', 'frontend/src/assets/images']:
    if os.path.exists(dest_dir):
        dest_file = os.path.join(dest_dir, 'splash_screen.mp4')
        shutil.copy2(out_mp4, dest_file)
        print(f"Synced to {dest_file}", flush=True)

print(f"Completed in {time.time() - t0:.2f} seconds!", flush=True)
