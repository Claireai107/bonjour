"""새 캐릭터 원본(1024px)을 웹용으로 변환해 public/에 배치한다.
- 본이엄마: 체커보드 배경 제거(가장자리 플러드필)
- 공통: 투명 여백 트림 → 높이 320px 리사이즈 → 최적화 PNG 저장
실행: python3 scripts/prepare_boni_assets.py (프로젝트 루트에서)
"""
from collections import deque
from PIL import Image
import os

SRC = "/Users/chaewon/bonjour/design/캐릭터에셋"
DST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
TARGET_H = 320

MAP = {
    "hello": "반가운인사포즈.png",
    "point": "확성기왼쪽.png",
    "speak": "앉아서확성기왼쪽.png",
    "think": "연구중모습.png",
    "aha": "아하느낌표모습.png",
    "heart": "하트든모습.png",
    "praise": "최고칭찬모습.png",
    "face": "얼굴만있음_웃는모습.png",
    "dad": "본이아빠.png",
    "mom": "본이엄마.png",
    "run": "달리기운동.png",
    "lift": "역기들고운동.png",
    "curious": "궁금한표정.png",
}


def is_checker(px):
    """체커보드 픽셀: 무채색(r≈g≈b)이고 밝음(>=195)."""
    r, g, b = px[0], px[1], px[2]
    return max(r, g, b) - min(r, g, b) <= 6 and min(r, g, b) >= 195


def remove_checkerboard(im):
    """가장자리에서 체커보드 색만 4방향 플러드필로 투명화."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        if not is_checker(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def center_on_centroid(im):
    """소품(확성기·하트 등)이 한쪽으로 뻗은 이미지는 박스 중앙 ≠ 몸통 중앙.
    알파 무게중심이 가로 중앙에 오도록 투명 패딩을 추가해 시각적 중앙을 맞춘다."""
    a = im.getchannel("A")
    w, h = im.size
    px = a.load()
    total = 0
    sx = 0
    for y in range(h):
        for x in range(w):
            v = px[x, y]
            if v:
                sx += x * v
                total += v
    if not total:
        return im
    cx = sx / total
    left, right = cx, (w - 1) - cx
    half = max(left, right)
    pad_l = int(round(half - left))
    pad_r = int(round(half - right))
    if pad_l == 0 and pad_r == 0:
        return im
    out = Image.new("RGBA", (w + pad_l + pad_r, h), (0, 0, 0, 0))
    out.paste(im, (pad_l, 0))
    return out


def process(pose, fname):
    im = Image.open(os.path.join(SRC, fname)).convert("RGBA")
    if pose == "mom":
        im = remove_checkerboard(im)
    bbox = im.getchannel("A").getbbox()
    if bbox:
        im = im.crop(bbox)
    ratio = TARGET_H / im.height
    im = im.resize((max(1, round(im.width * ratio)), TARGET_H), Image.LANCZOS)
    im = center_on_centroid(im)
    out = os.path.join(DST, f"boni-{pose}.png")
    im.save(out, optimize=True)
    kb = os.path.getsize(out) / 1024
    print(f"boni-{pose}.png  {im.width}x{im.height}  {kb:.0f}KB")
    assert kb < 150, f"{pose} 150KB 초과"


for pose, fname in MAP.items():
    process(pose, fname)

for legacy in ("boni-greet.png", "boni-heart2.png", "boni-wink.png"):
    p = os.path.join(DST, legacy)
    if os.path.exists(p):
        os.remove(p)
        print(f"removed {legacy}")
print("done")
