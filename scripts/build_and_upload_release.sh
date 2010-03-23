#!/bin/sh

USAGE="Usage: $0 <bzr-tag-to-release> <googlecode-username> <googlecode-password>"

RELEASE_TAG=${1:?$USAGE}
USERNAME=${2:?$USAGE}
PASSWORD=${3:?$USAGE}

cd "$(dirname "$0")/.."

mkdir -p build

FILENAME="build/jquery-editInPlace-v${RELEASE_TAG}.zip"

bzr export --revision="$RELEASE_TAG"  "$FILENAME"

SUMMARY="jQuery In Place Editor v${RELEASE_TAG}"
python scripts/googlecode_upload.py \
	--summary="$SUMMARY" \
	--project="jquery-in-place-editor" \
	--user="$USERNAME" \
	--password="$PASSWORD" \
	--labels="Type-Archive,OpSys-All" \
	"$FILENAME"

echo "Now you can feature this download at http://code.google.com/p/jquery-in-place-editor/downloads/list"