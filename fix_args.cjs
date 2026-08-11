const fs = require('fs');
let content = fs.readFileSync('src/components/BankSoalan.tsx', 'utf8');
content = content.replace(
  '        await createAssignment(token, courseId, {\n          title: sendForm.title,\n          description: sendForm.description,\n          points: sendForm.points,\n          link: link\n        });',
  '        await createAssignment(token, courseId, sendForm.title, sendForm.description, link, sendForm.points);'
);
fs.writeFileSync('src/components/BankSoalan.tsx', content);
