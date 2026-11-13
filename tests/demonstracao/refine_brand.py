"""Lossless technical copies. --write is explicit; default verifies without rewriting assets.
Only disconnected alpha=1 components >=24px from ANY alpha>1 pixel are removed.
No colour changes, resampling, thresholding of shadows, drawing or lettering operations.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SOURCE_MANIFEST = ROOT / 'tests/demonstracao/brand/manifest.json'
COPY_MANIFEST = ROOT / 'src/components/demonstracao/technical-copies.json'
POLICY = {'alphaRemoved': 1, 'minimumDistancePx': 24, 'connectivity': 8, 'safeAreaFraction': 0.05, 'minimumSafeAreaPx': 12}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def refine(source):
    a = source[:, :, 3]
    labels, number = ndimage.label(a > 0, structure=np.ones((3, 3), dtype=bool))
    ids = np.arange(1, number + 1)
    distance = ndimage.distance_transform_edt(a <= 1)
    peak = ndimage.maximum(a, labels, ids)
    nearest = ndimage.minimum(distance, labels, ids)
    selected = ids[(peak == 1) & (nearest >= POLICY['minimumDistancePx'])]
    mask = np.isin(labels, selected)
    clean = source.copy()
    clean[:, :, 3][mask] = 0
    # All RGB samples, all alpha>1, and alpha=1 near/connected to shadows remain intact.
    assert np.array_equal(source[:, :, :3], clean[:, :, :3])
    assert np.all(source[:, :, 3][mask] == 1)
    assert np.all(distance[mask] >= POLICY['minimumDistancePx'])
    assert np.array_equal(source[:, :, 3][~mask], clean[:, :, 3][~mask])
    ys, xs = np.where(clean[:, :, 3] > 0)
    bbox = [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)]
    pad = max(POLICY['minimumSafeAreaPx'], math.ceil(max(bbox[2]-bbox[0], bbox[3]-bbox[1])*POLICY['safeAreaFraction']))
    window = [bbox[0]-pad, bbox[1]-pad, bbox[2]+pad, bbox[3]+pad]
    x0,y0,x1,y1 = window
    output = np.zeros((y1-y0,x1-x0,4), dtype=np.uint8)
    sx0,sy0,sx1,sy1 = max(0,x0),max(0,y0),min(source.shape[1],x1),min(source.shape[0],y1)
    output[sy0-y0:sy1-y0,sx0-x0:sx1-x0] = clean[sy0:sy1,sx0:sx1]
    # Nothing visible is discarded; new pixels outside the source are transparent.
    assert np.count_nonzero(output[:, :, 3]) == np.count_nonzero(clean[:, :, 3])
    assert np.array_equal(output[sy0-y0:sy1-y0,sx0-x0:sx1-x0,:3],source[sy0:sy1,sx0:sx1,:3])
    return output, {
        'contentBBox':bbox,'sourceWindow':window,'safeAreaPx':pad,
        'width':x1-x0,'height':y1-y0,'removedPixels':int(mask.sum()),
        'removedComponents':int(len(selected)),'removalMaskSHA256':sha(np.packbits(mask).tobytes()),
        'rgbChanged':0,'retainedAlphaChanged':0,'resampled':False,
    }


def main(write=False):
    original = json.loads(SOURCE_MANIFEST.read_text())
    results=[]
    for entry in original['files']:
        path=ROOT / ('public'+entry['path'])
        assert sha(path.read_bytes()) == entry['sha256'], 'Original alterado'
        with Image.open(path) as im:
            assert im.mode == 'RGBA'
            source=np.array(im)
        expected, info=refine(source)
        dest=ROOT / f"public/brand/revisadas/ja-{entry['variant']}-tecnica.png"
        if write:
            dest.parent.mkdir(parents=True,exist_ok=True)
            Image.fromarray(expected).save(dest,format='PNG',compress_level=9)
        with Image.open(dest) as im:
            actual=np.array(im)
            assert im.mode == 'RGBA'
        assert np.array_equal(actual,expected), 'Cópia diverge das operações autorizadas'
        assert sha(path.read_bytes()) == entry['sha256'], 'Original alterado durante execução'
        record={'variant':entry['variant'],'path':'/'+str(dest.relative_to(ROOT/'public')),
                'sourceSHA256':entry['sha256'],'sha256':sha(dest.read_bytes()),**info}
        results.append(record)
        print(f"PASS {entry['variant']}: RGB intacto; {info['removedPixels']} pixels alfa=1 isolados; {info['width']}x{info['height']}; segurança {info['safeAreaPx']}px")
    report={'policy':POLICY,'variants':results,'status':'comparison-only-not-approved-for-panels'}
    if write:
        COPY_MANIFEST.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    else:
        assert report == json.loads(COPY_MANIFEST.read_text()), 'Manifesto diverge da verificação'
    print('PASS: originais preservados; cópias verificadas pixel a pixel; sem redesenho/recoloração')


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--write',action='store_true',help='Gerar apenas as cópias técnicas e seu manifesto')
    main(parser.parse_args().write)
