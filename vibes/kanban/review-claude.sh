#!/bin/bash
# 常に Claude がレビュー担当者となるよう、このスクリプトから呼び出す。
set -e

claude --permission-mode bypassPermissions --model 'opus' -p "/pr-review-toolkit:review-pr all parallel @vibes/kanban/review.md に従ってレビューを行ってください"

