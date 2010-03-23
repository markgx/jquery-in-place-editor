#!/bin/sh

# TODO: consider to create / update the tag when running the release script
# TODO: push changes to google code
# TODO: find out how to save multiple push locations
# claim commits for my other email address

USAGE="Usage: $0 <bzr-tag-to-release> <googlecode-username> <googlecode-password>"

RELEASE_TAG=${1:? $USAGE}
USERNAME=${2:? $USAGE}
PASSWORD=${3:? $USAGE}

cd "$(dirname "$0")/.."

# update changelog
bzr log --log-format=gnu-changelog > CHANGELOG
bzr commit CHANGELOG -m "updated changelog before release"

# build release zip
mkdir -p build
EXPORTED_FILE="build/jquery-editInPlace-v${RELEASE_TAG}.zip"
bzr export --revision="$RELEASE_TAG" "$EXPORTED_FILE"

# upload release zip
SUMMARY="jQuery In Place Editor v${RELEASE_TAG}"
python scripts/googlecode_upload.py \
	--summary="$SUMMARY" \
	--project="jquery-in-place-editor" \
	--user="$USERNAME" \
	--password="$PASSWORD" \
	--labels="Type-Archive,OpSys-All" \
	"$EXPORTED_FILE"

echo
echo
echo "Now you can feature this download at http://code.google.com/p/jquery-in-place-editor/downloads/list"
echo
echo