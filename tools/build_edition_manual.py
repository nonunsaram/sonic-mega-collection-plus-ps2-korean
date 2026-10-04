"""한국어 매뉴얼을 웹 뷰어용으로 만들고, 작업용 원본·클린본 zip을 함께 묶습니다.

사용법:
  python tools/build_edition_manual.py 원본폴더 --id sonic-cd --title "소닉 CD" \
      --platform "메가 CD" --source-edition "일본어판" --collection gems --zip-dir 받기용zip폴더

원본폴더 안에 ko/ (한국어), original/ (원본), clean/ (클린본: 원본에서 글자만 지운 본) 하위 폴더를
두고 페이지 이미지를 파일 이름 순서대로 넣습니다. 뷰어에는 한국어 본만 보입니다.

결과물:
  docs/assets/manuals/{id}/001.jpg ...    뷰어 표시용 JPEG (긴 변 최대 2560px)
  docs/assets/manuals/{id}/thumbs/        페이지 목록용 썸네일 (높이 360px)
  docs/data/manuals/{id}.json             기존 페이지 제목과 부록 구분은 유지합니다.
  {zip-dir}/{id}-original.zip, {id}-clean.zip
      무손실 원본 그대로 묶은 작업용 파일. 사이트 용량 한도(1GB) 때문에 저장소에 넣지 않고
      GitHub 릴리스(태그 RELEASE_TAG)에 같은 이름으로 올립니다.
그다음 docs/data/catalog.json에 항목을 직접 추가하거나 갱신합니다.
"""
import argparse, json, shutil, zipfile
from pathlib import Path
from PIL import Image

DOWNLOADS = [('original', '원본'), ('clean', '클린본')]
DOCS = Path(__file__).resolve().parent.parent / 'docs'
REPO = 'https://github.com/nonunsaram/sonic-mega-collection-plus-ps2-korean'
RELEASE_TAG = 'manual-files'
IMAGE_TYPES = {'.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.bmp'}
MAX_SIDE = 2560


def pages_in(folder):
    return sorted(p for p in folder.iterdir() if p.suffix.lower() in IMAGE_TYPES) if folder.is_dir() else []


def to_rgb(image):
    if image.mode in ('RGBA', 'LA', 'P'):
        image = image.convert('RGBA')
        flat = Image.new('RGB', image.size, 'white')
        flat.paste(image, mask=image.getchannel('A'))
        return flat
    return image.convert('RGB')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--id', required=True)
    parser.add_argument('--title', required=True)
    parser.add_argument('--platform', required=True)
    parser.add_argument('--source-edition', required=True)
    parser.add_argument('--collection')
    parser.add_argument('--zip-dir', type=Path)
    args = parser.parse_args()

    korean = pages_in(args.source / 'ko')
    if not korean:
        raise SystemExit('ko 폴더에 한국어 페이지가 없습니다.')
    manifest_path = DOCS / 'data' / 'manuals' / f'{args.id}.json'
    old = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    old_pages = old.get('pages', [])
    root = DOCS / 'assets' / 'manuals' / args.id
    if root.exists():
        shutil.rmtree(root)
    (root / 'thumbs').mkdir(parents=True)

    # 원본에 없는 뒤쪽 페이지(번역자 부록 등)는 부록으로 표시합니다.
    originals = len(pages_in(args.source / 'original')) or len(korean)
    pages = []
    for index, source in enumerate(korean):
        number = f'{index + 1:03d}'
        previous = old_pages[index] if index < len(old_pages) else {}
        with Image.open(source) as image:
            rgb = to_rgb(image)
        rgb.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        rgb.save(root / f'{number}.jpg', quality=88, optimize=True, progressive=True)
        thumb = rgb.copy()
        thumb.thumbnail((10000, 360), Image.LANCZOS)
        thumb.save(root / 'thumbs' / f'{number}.jpg', quality=82, optimize=True)
        pages.append({
            'number': index + 1,
            'title': previous.get('title', f'{index + 1}페이지'),
            'kind': previous.get('kind', 'appendix' if index >= originals else 'manual'),
            'image': f'assets/manuals/{args.id}/{number}.jpg',
            'thumb': f'assets/manuals/{args.id}/thumbs/{number}.jpg',
            'width': rgb.width, 'height': rgb.height,
        })

    with Image.open(root / '001.jpg') as image:
        image.thumbnail((800, 800), Image.LANCZOS)
        image.save(root / 'cover.jpg', quality=88, optimize=True)

    downloads = []
    for key, label in DOWNLOADS:
        files = pages_in(args.source / key)
        if not files:
            continue
        name = f'{args.id}-{key}.zip'
        size = None
        if args.zip_dir:
            args.zip_dir.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(args.zip_dir / name, 'w', zipfile.ZIP_STORED) as bundle:
                for index, source in enumerate(files):
                    bundle.write(source, f'{args.id}-{key}/{index + 1:03d}{source.suffix.lower()}')
            size = (args.zip_dir / name).stat().st_size
        else:
            size = next((d.get('bytes') for d in old.get('downloads', []) if d.get('id') == key), None)
        downloads.append({'id': key, 'label': label, 'pages': len(files),
                          'url': f'{REPO}/releases/download/{RELEASE_TAG}/{name}',
                          **({'bytes': size} if size else {})})

    appendix = sum(page['kind'] == 'appendix' for page in pages)
    manifest = {
        'id': args.id, 'title': args.title, 'platform': args.platform,
        'sourceEdition': args.source_edition,
        **({'collection': args.collection} if args.collection else {}),
        'pageCount': len(pages), 'manualPageCount': len(pages) - appendix, 'appendixCount': appendix,
        'cover': f'assets/manuals/{args.id}/cover.jpg',
        'manifest': f'data/manuals/{args.id}.json',
        'downloads': downloads,
        'pages': pages,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{args.id}: 한국어 {len(pages)}페이지, 받기용 zip {[d["id"] for d in downloads]} → {manifest_path.relative_to(DOCS.parent)}')


if __name__ == '__main__':
    main()
