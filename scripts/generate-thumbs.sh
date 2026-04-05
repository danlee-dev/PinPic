#!/bin/bash
# Generate thumbnails for all images in uploaded_img/
# Output to uploaded_img/thumbs/ at max 600px width, JPEG quality 70

SRCDIR="$(dirname "$0")/../uploaded_img"
THUMBDIR="$SRCDIR/thumbs"
mkdir -p "$THUMBDIR"

for file in "$SRCDIR"/*.jpg "$SRCDIR"/*.jpeg "$SRCDIR"/*.png; do
  [ -f "$file" ] || continue
  filename=$(basename "$file")
  outname="${filename%.*}.jpg"

  echo "Processing: $filename"
  sips -Z 800 -s format jpeg -s formatOptions 70 "$file" --out "$THUMBDIR/$outname" 2>/dev/null

  original=$(du -h "$file" | cut -f1)
  thumb=$(du -h "$THUMBDIR/$outname" | cut -f1)
  echo "  $original -> $thumb"
done

echo "Done! Thumbnails in $THUMBDIR/"
