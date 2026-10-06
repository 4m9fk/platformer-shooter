"""Draw OpenPose (COCO-18) skeletons for chibi animation frames, character facing right.

Usage: python poses.py <out_dir>
Writes <anim>_<frame>.png on a black 1024x1024 canvas, the format the OpenPose ControlNet expects.
"""
import math, sys
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 1024
GROUND = 900
THIGH, SHIN = 90, 90
UPPER_ARM, FOREARM = 75, 70

# COCO-18: 0 nose, 1 neck, 2 r_sho, 3 r_elb, 4 r_wri, 5 l_sho, 6 l_elb, 7 l_wri, 8 r_hip, 9 r_knee,
# 10 r_ank, 11 l_hip, 12 l_knee, 13 l_ank, 14 r_eye, 15 l_eye, 16 r_ear, 17 l_ear
LIMBS = [(1, 2), (1, 5), (2, 3), (3, 4), (5, 6), (6, 7), (1, 8), (8, 9), (9, 10), (1, 11), (11, 12),
         (12, 13), (1, 0), (0, 14), (14, 16), (0, 15), (15, 17)]
COLORS = [(255, 0, 0), (255, 85, 0), (255, 170, 0), (255, 255, 0), (170, 255, 0), (85, 255, 0), (0, 255, 0),
          (0, 255, 85), (0, 255, 170), (0, 255, 255), (0, 170, 255), (0, 85, 255), (0, 0, 255), (85, 0, 255),
          (170, 0, 255), (255, 0, 255), (255, 0, 170), (255, 0, 85)]


def polar(origin, length, deg):
    """Point at `length` from origin; deg=0 points straight down, positive swings forward (+x)."""
    r = math.radians(deg)
    return origin[0] + length * math.sin(r), origin[1] + length * math.cos(r)


def body(dx=0, dy=0, lean=0, head_tilt=0):
    """Upper body + head keypoints. lean shifts the neck/head forward (+) or back (-)."""
    nx, ny = 500 + dx + lean, 540 + dy
    hx, hy = nx + head_tilt, ny
    return {
        1: (nx, ny),
        0: (hx + 90, hy - 110), 14: (hx + 60, hy - 140), 15: (hx + 120, hy - 145), 16: (hx - 30, hy - 120),
        2: (nx - 30, ny + 25), 5: (nx + 35, ny + 20),
        8: (490 + dx, 720 + dy), 11: (525 + dx, 715 + dy),
    }


def leg(kp, hip, knee, ankle, thigh_deg, knee_bend):
    kp[knee] = polar(kp[hip], THIGH, thigh_deg)
    kp[ankle] = polar(kp[knee], SHIN, thigh_deg - knee_bend)


def arm(kp, sho, elb, wri, upper_deg, elbow_bend):
    kp[elb] = polar(kp[sho], UPPER_ARM, upper_deg)
    kp[wri] = polar(kp[elb], FOREARM, upper_deg + elbow_bend)


def gun_arm(kp, raise_deg=0):
    """Near (right) arm extended forward holding the blaster at chest level."""
    arm(kp, 2, 3, 4, 70 + raise_deg, 20 + raise_deg)


def walk(frames=6):
    out = []
    for i in range(frames):
        p = i / frames
        swing = 28 * math.sin(2 * math.pi * p)
        moving_fwd = math.cos(2 * math.pi * p) > 0  # near leg swinging forward
        kp = body(dy=-10 * abs(math.sin(2 * math.pi * p)) + 5)
        leg(kp, 8, 9, 10, swing, 35 if moving_fwd else 5)
        leg(kp, 11, 12, 13, -swing, 5 if moving_fwd else 35)
        gun_arm(kp)
        arm(kp, 5, 6, 7, -0.8 * swing, 25)
        out.append(kp)
    return out


def jump():
    # crouch
    kp = body(dy=60, lean=25)
    leg(kp, 8, 9, 10, 55, 110); leg(kp, 11, 12, 13, 50, 105)
    gun_arm(kp, -20); arm(kp, 5, 6, 7, -45, 20)
    frames = [kp]
    # take-off: fully extended, slightly off the ground
    kp = body(dy=-40, lean=10)
    leg(kp, 8, 9, 10, -10, 0); leg(kp, 11, 12, 13, -20, 5)
    gun_arm(kp, 15); arm(kp, 5, 6, 7, 150, 10)
    frames.append(kp)
    # apex: tucked high in the air
    kp = body(dy=-160)
    leg(kp, 8, 9, 10, 70, 120); leg(kp, 11, 12, 13, 50, 110)
    gun_arm(kp, 10); arm(kp, 5, 6, 7, 120, 30)
    frames.append(kp)
    # landing: knees absorbing the impact
    kp = body(dy=40, lean=15)
    leg(kp, 8, 9, 10, 40, 80); leg(kp, 11, 12, 13, 30, 70)
    gun_arm(kp, -10); arm(kp, 5, 6, 7, 60, 20)
    frames.append(kp)
    return frames


def shoot():
    frames = []
    for raise_deg, lean in ((0, 0), (0, 0), (25, -15)):  # aim, fire, recoil
        kp = body(lean=lean, head_tilt=-lean // 2)
        leg(kp, 8, 9, 10, 18, 5); leg(kp, 11, 12, 13, -15, 5)
        arm(kp, 2, 3, 4, 88 + raise_deg, 2 + raise_deg)
        arm(kp, 5, 6, 7, -10, 30)
        frames.append(kp)
    return frames


ANIMATIONS = {"walk": walk, "jump": jump, "shoot": shoot}


def draw(kp):
    img = Image.new("RGB", (SIZE, SIZE), "black")
    d = ImageDraw.Draw(img)
    for i, (a, b) in enumerate(LIMBS):
        if a in kp and b in kp:
            d.line([kp[a], kp[b]], fill=tuple(int(c * 0.6) for c in COLORS[i]), width=10)
    for i, (x, y) in kp.items():
        d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=COLORS[i])
    return img


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "poses")
    out.mkdir(parents=True, exist_ok=True)
    for name, make in ANIMATIONS.items():
        for i, kp in enumerate(make()):
            draw(kp).save(out / f"{name}_{i}.png")
            print(out / f"{name}_{i}.png")
