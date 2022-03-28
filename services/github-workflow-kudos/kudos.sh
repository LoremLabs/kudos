#!/bin/sh

echo "Kudos!"

# simple example, extract from node js package.json
rm /tmp/kudos.txt
# try author
cat package.json | jq -r '.author' >> /tmp/a.txt 
# try contributors
cat package.json | jq -r '.contributors[]' >> /tmp/kudos.txt
# try maintainers
cat package.json | jq -r '.maintainers[]' >> /tmp/kudos.txt

echo "Kudos to:"
cat /tmp/kudos.txt | sort | uniq

