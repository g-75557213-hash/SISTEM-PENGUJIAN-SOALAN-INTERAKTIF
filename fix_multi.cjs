const fs = require('fs');
let code = fs.readFileSync('src/components/BankSoalan.tsx', 'utf8');
code = code.replace(
`    try {
      // Loop createAssignment for all selected courseIds
      for (const courseId of sendForm.courseIds) {
        let qs = \`?qid=\${sendQ.idSoalan}\`;
        if (spreadsheetId) qs += \`&spreadsheetId=\${spreadsheetId}\`;
        if (gasWebAppUrl) qs += \`&gasWebAppUrl=\${encodeURIComponent(gasWebAppUrl)}\`;
        
        const link = gasWebAppUrl 
          ? \`\${gasWebAppUrl}\${gasWebAppUrl.includes('?') ? '&' : '?'}qid=\${sendQ.idSoalan}\`
          : \`\${window.location.origin}/\${qs}\`;
          
        await createAssignment(token, courseId, sendForm.title, sendForm.description, link, sendForm.points);
      }
      alert('Tugasan berjaya dihantar ke kelas yang dipilih!');
      setShowSendModal(false);
      loadAssignmentStatus();
    } catch (err: any) {
      alert('Ralat semasa menghantar tugasan: ' + err.message);
    } finally {
      setLoadingMulti(false);
    }
  };`,
`    try {
      const assignmentsCreated = [];
      // Loop createAssignment for all selected courseIds
      for (const courseId of sendForm.courseIds) {
        let qs = \`?qid=\${sendQ.idSoalan}\`;
        if (spreadsheetId) qs += \`&spreadsheetId=\${spreadsheetId}\`;
        if (gasWebAppUrl) qs += \`&gasWebAppUrl=\${encodeURIComponent(gasWebAppUrl)}\`;
        
        const link = gasWebAppUrl 
          ? \`\${gasWebAppUrl}\${gasWebAppUrl.includes('?') ? '&' : '?'}qid=\${sendQ.idSoalan}\`
          : \`\${window.location.origin}/\${qs}\`;
          
        const assignment = await createAssignment(token, courseId, sendForm.title, sendForm.description, link, sendForm.points);
        assignmentsCreated.push({
          courseId,
          courseWorkId: assignment.id
        });
      }
      
      await fetch('/api/assignment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qid: sendQ.idSoalan,
          email: user.email,
          assignments: assignmentsCreated
        })
      });
      
      alert('Tugasan berjaya dihantar ke kelas yang dipilih!');
      setShowSendModal(false);
      loadAssignmentStatus();
    } catch (err: any) {
      alert('Ralat semasa menghantar tugasan: ' + err.message);
    } finally {
      setLoadingMulti(false);
    }
  };`
);
fs.writeFileSync('src/components/BankSoalan.tsx', code);
