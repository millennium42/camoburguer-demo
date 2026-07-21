#!/usr/bin/env bash

set -euo pipefail

source_dir="$(pwd -P)"
staging_dir="$HOME/.cache/camoburguer-demo/graphify-worktree"
artifacts=(
  ".graphify_labels.json"
  "GRAPH_REPORT.md"
  "graph.html"
  "graph.json"
  "manifest.json"
)

command -v graphify >/dev/null
command -v rsync >/dev/null

mkdir -p "$staging_dir"
rsync -a --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='graphify-out' \
  "$source_dir/" "$staging_dir/"

if [[ ! -f "$staging_dir/graphify-out/graph.json" ]]; then
  mkdir -p "$staging_dir/graphify-out"
  rsync -a "$source_dir/graphify-out/" "$staging_dir/graphify-out/"
fi

if ! graphify update "$staging_dir"; then
  graphify extract "$staging_dir" --out "$staging_dir" --code-only --no-cluster
  graphify cluster-only "$staging_dir"
fi

out_dir="$staging_dir/.graphify"
if [[ ! -d "$out_dir" ]]; then
  out_dir="$staging_dir/graphify-out"
fi

mkdir -p "$source_dir/graphify-out"
for artifact in "${artifacts[@]}"; do
  if [[ -f "$out_dir/$artifact" ]]; then
    rsync -a "$out_dir/$artifact" "$source_dir/graphify-out/$artifact"
  fi
done

graphify query "guia desenvolvimento validação release" \
  --graph "$out_dir/graph.json" \
  --budget 400
