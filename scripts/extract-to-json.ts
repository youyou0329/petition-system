import { FetchClient, Config } from 'coze-coding-dev-sdk';
import * as fs from 'fs';

const FILES = [
  { name: '信访办理明白纸', category: '办理流程', url: 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E4%BF%A1%E8%AE%BF%E5%8A%9E%E7%90%86%E6%98%8E%E7%99%BD%E7%BA%B8%EF%BC%88%E5%AE%8C%E5%96%84%EF%BC%89.doc&nonce=4a0e9e74-633b-40c1-84cb-b1e0bd3d72d7&project_id=7639260294035898374&sign=e2aa2e8309ea0a4c2b79c1c07d500d46771416de5c11f4e5084c25affb24b245' },
  { name: '信访工作条例', category: '法规条例', url: 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E4%BF%A1%E8%AE%BF%E5%B7%A5%E4%BD%9C%E6%9D%A1%E4%BE%8B.docx&nonce=cb65fde4-bf94-4481-832d-c37bea3193f1&project_id=7639260294035898374&sign=802f4d9897e823125b889931963d88de466889ad36778b20ffeb4326c4c7b958' },
  { name: '生态环境信访事项办理指南', category: '办理流程', url: 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F01-%E7%94%9F%E6%80%81%E7%8E%AF%E5%A2%83%E4%BF%A1%E8%AE%BF%E4%BA%8B%E9%A1%B9%E5%8A%9E%E7%90%86%E6%8C%87%E5%8D%97.doc&nonce=65ebf7a9-fca7-425e-962e-759d18d64f2d&project_id=7639260294035898374&sign=e1bb64a56cbb2d48150238bd717a42ca020f2a36af672a627d1ce3f96807220f' },
  { name: '生态环境信访事项受理办理文书模版', category: '文书模板', url: 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F03-%E7%94%9F%E6%80%81%E7%8E%AF%E5%A2%83%E4%BF%A1%E8%AE%BF%E4%BA%8B%E9%A1%B9%E5%8F%97%E7%90%86%E5%8A%9E%E7%90%86%E6%96%87%E4%B9%A6%E6%A8%A1%E7%89%88.docx&nonce=d4309f18-469e-48ce-a358-fa6b7ab8a281&project_id=7639260294035898374&sign=75f5c8751ab83b63119fe91ca8ce7b7f014a5369e0ce44d52cc26773494af200' },
  { name: '关于贯彻落实《生态环境信访工作办法》的几点提示', category: '工作要求', url: 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E5%85%B3%E4%BA%8E%E8%B4%AF%E5%BD%BB%E8%90%BD%E5%AE%9E%E3%80%8A%E7%94%9F%E6%80%81%E7%8E%AF%E5%A2%83%E4%BF%A1%E8%AE%BF%E5%B7%A5%E4%BD%9C%E5%8A%9E%E6%B3%95%E3%80%8B%EF%BC%8C%E5%88%87%E5%AE%9E%E5%81%9A%E5%A5%BD%E7%94%9F%E6%80%81%E7%8E%AF%E5%A2%83%E4%BF%A1%E8%AE%BF%E5%B7%A5%E4%BD%9C%E7%9A%84%E5%87%A0%E7%82%B9%E6%8F%90%E7%A4%BA.doc&nonce=60bce367-382f-4066-ad40-9a74e3454797&project_id=7639260294035898374&sign=4c3c2cc0c217506e87f9b4747c073df8850275197c1589f8c0608759ebfc7e00' },
  { name: '关于规范和提升生态环境网上投诉举报工作的通知', category: '工作要求', url: 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E5%85%B3%E4%BA%8E%E8%A7%84%E8%8C%83%E5%92%8C%E6%8F%90%E5%8D%87%E7%94%9F%E6%80%81%E7%8E%AF%E5%A2%83%E7%BD%91%E4%B8%8A%E6%8A%95%E8%AF%89%E4%B8%BE%E6%8A%A5%E5%B7%A5%E4%BD%9C%E7%9A%84%E9%80%9A%E7%9F%A5.pdf&nonce=4d1b9d20-650e-48aa-9d63-de37be7b0902&project_id=7639260294035898374&sign=bcfd03aa300b8d65870805942aaa6de36dc7f4dc467caff9c2cc7f1715cdd531' },
  { name: '关于印发《生态环境信访工作办法》的通知', category: '法规条例', url: 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E5%85%B3%E4%BA%8E%E5%8D%B0%E5%8F%91%E3%80%8A%E7%94%9F%E6%80%81%E7%8E%AF%E5%A2%83%E4%BF%A1%E8%AE%BF%E5%B7%A5%E4%BD%9C%E5%8A%9E%E6%B3%95%E3%80%8B%E7%9A%84%E9%80%9A%E7%9F%A5.pdf&nonce=f05c6bd3-7906-4194-9c54-213d4dfabfb3&project_id=7639260294035898374&sign=3b9289355376a3a6082b2b9d82cc9e9e335597e0267b1c998ccc54af2b4fc336' },
  { name: '山东省生态环境信访事项办理工作指引', category: '办理流程', url: 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E5%B1%B1%E4%B8%9C%E7%9C%81%E7%94%9F%E6%80%81%E7%8E%AF%E5%A2%83%E5%8E%85%E5%85%B3%E4%BA%8E%E5%8D%B0%E5%8F%91%E3%80%8A%E5%B1%B1%E4%B8%9C%E7%9C%81%E7%94%9F%E6%80%81%E7%8E%AF%E5%A2%83%E4%BF%A1%E8%AE%BF%E4%BA%8B%E9%A1%B9%E5%8A%9E%E7%90%86%E5%B7%A5%E4%BD%9C%E6%8C%87%E5%BC%95%E3%80%8B%E7%9A%84%E9%80%9A%E7%9F%A5.pdf&nonce=260d59d4-d759-46c8-bf15-52343d413342&project_id=7639260294035898374&sign=f428c7c39b977046381c3db2a1eafe110e67e5adba168f30dd601834f4ee1ad8' },
  { name: '山东省信访事项复查复核工作规则', category: '法规条例', url: 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E5%B1%B1%E4%B8%9C%E7%9C%81%E4%BF%A1%E8%AE%BF%E4%BA%8B%E9%A1%B9%E5%A4%8D%E6%9F%A5%E5%A4%8D%E6%A0%B8%E5%B7%A5%E4%BD%9C%E8%A7%84%E5%88%99%EF%BC%88%E8%AF%95%E8%A1%8C%EF%BC%89.doc&nonce=2ffecb96-6df4-4b7b-ae31-022426cbafba&project_id=7639260294035898374&sign=ccd7578e823bc51e827be527574ba98f22ccc6658fad3f683a80f88a062715c5' },
  { name: '生态环境领域依法分类处理信访诉求清单', category: '办理流程', url: 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E7%94%9F%E6%80%81%E7%8E%AF%E5%A2%83%E9%A2%86%E5%9F%9F%E4%BE%9D%E6%B3%95%E5%88%86%E7%B1%BB%E5%A4%84%E7%90%86%E4%BF%A1%E8%AE%BF%E8%AF%89%E6%B1%82%E6%B8%85%E5%8D%95-%E5%8D%B0%E5%8F%91%E7%89%88.pdf&nonce=d4c2a8fb-42ce-4b66-9633-cdcf1625a3d3&project_id=7639260294035898374&sign=7ce3eb74c397bb64173b29fc4c1a8acb58e4c122b1d42db2679cbc9798cd547c' },
];

async function main() {
  const config = new Config();
  const fetchClient = new FetchClient(config);

  console.log('提取指引文件内容并保存...\n');
  
  const results: { name: string; category: string; content: string }[] = [];

  for (const file of FILES) {
    console.log(`正在处理: ${file.name}`);
    
    try {
      const fetchResponse = await fetchClient.fetch(file.url);
      
      if (fetchResponse.status_code !== 0) {
        console.log(`  ❌ 提取失败: ${fetchResponse.status_message}`);
        continue;
      }

      const textContent = fetchResponse.content
        .filter(item => item.type === 'text' && item.text)
        .map(item => item.text)
        .join('\n');

      if (!textContent || textContent.length < 50) {
        console.log(`  ⚠️ 内容太少，跳过`);
        continue;
      }

      console.log(`  📄 提取到 ${textContent.length} 个字符`);
      results.push({ name: file.name, category: file.category, content: textContent });

    } catch (error) {
      console.log(`  ❌ 处理出错: ${error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // 保存结果到 JSON 文件
  const outputPath = '/workspace/projects/data/guidelines.json';
  fs.mkdirSync('/workspace/projects/data', { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  
  console.log(`\n========================================`);
  console.log(`提取完成！共 ${results.length} 个文件`);
  console.log(`已保存到: ${outputPath}`);
}

main().catch(console.error);
