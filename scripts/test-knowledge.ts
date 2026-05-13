import { KnowledgeClient, Config } from 'coze-coding-dev-sdk';

async function main() {
  const config = new Config();
  const client = new KnowledgeClient(config);

  console.log('测试知识库搜索...\n');

  const queries = [
    '信访',
    '生态环境',
    '答复',
    '办理',
  ];

  for (const query of queries) {
    console.log(`搜索: "${query}"`);
    const response = await client.search(query, undefined, 5, 0.1);
    
    if (response.code === 0) {
      console.log(`  找到 ${response.chunks?.length || 0} 个结果`);
      if (response.chunks && response.chunks.length > 0) {
        response.chunks.slice(0, 2).forEach((chunk, i) => {
          console.log(`  [${i + 1}] 分数: ${chunk.score}`);
          console.log(`      内容: ${chunk.content?.substring(0, 100)}...`);
        });
      }
    } else {
      console.log(`  搜索失败: ${response.msg}`);
    }
    console.log('');
  }
}

main().catch(console.error);
