const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    //パラメータを取得
    const token = core.getInput("token");
    const files = core.getInput("patterns")
    
    //コンテキストから必要な情報を取得
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    
    // デバッグ情報を出力
    core.info(`Context event: ${github.context.eventName}`);
    core.info(`Payload: ${JSON.stringify(github.context.payload)}`);
    
    //const issueNumber = github.context.issue.number;
    const issueNumber = github.context.payload.pull_request?.number;

    if (!issueNumber) {
      throw new Error('プルリクエストが見つかりません。');
    }

    //パターンにマッチするファイルを取得
    const globber = await glob.create(files);
    const filePaths = await globber.glob();

    //ファイルの文字数を数えてコメントを生成
    const cwd = process.cwd();
    let total = 0;
    const rows = ["| ファイル名 | 文字数 |", "| --- | ---: |"];
    for (const filePath of filePaths) {
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        core.info(`$filePath}はファイルではないためスキップします。`);
        continue;
      }
      const content = fs.readFileSync(filePath, "utf-8");
      const relativePath = path.relative(cwd, filePath);
      const charCount = content.length;
      rows.push(`| ${relativePath} | ${charCount} |`);
      total += charCount;
    }
    rows.push(`| **合計** | **${total}** |`);
    const body = rows.join("\n");

    //プルリクエストにコメント
    const octokit = new github.GitHub({auth: token});
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();