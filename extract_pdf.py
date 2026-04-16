import zlib
import re

def extract_pdf_text(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()
    
    # Find all streams
    streams = re.findall(b'stream\r?\n(.*?)\r?\nendstream', data, re.S)
    
    for i, s in enumerate(streams):
        try:
            decompressed = zlib.decompress(s)
            text = decompressed.decode('ascii', errors='ignore')
            # Look for IDF related keywords
            if 'IDF' in text or 'Record' in text or '3' in text:
                print(f"--- Stream {i} ---")
                print(text[:1000])
        except:
            pass

if __name__ == "__main__":
    extract_pdf_text('public/samples/isogen_info.pdf')
