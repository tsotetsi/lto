#!/bin/bash
set -e

echo "Updating requirement files with hashes..."

pip install pip-tools
pip-compile --generate-hashes --strip-extras requirements/base.in -o requirements/base.txt
pip-compile --generate-hashes --strip-extras requirements/development.in -o requirements/development.txt
pip-compile --generate-hashes --strip-extras requirements/production.in -o requirements/production.txt

echo "Requirements updated with latest hashes!"
echo "Don't forget to commit the updated .txt files."