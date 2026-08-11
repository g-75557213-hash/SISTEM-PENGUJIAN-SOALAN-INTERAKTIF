const fs = require('fs');
let code = fs.readFileSync('src/components/BankSoalan.tsx', 'utf8');

code = code.replace(
  "import { createAssignment } from '../lib/classroom';",
  "import { createAssignment, deleteAssignment } from '../lib/classroom';"
);

code = code.replace(
`  const handleResetStatus = (qid: string) => {
    if (confirm('Adakah anda pasti mahu set semula status tugasan ini?')) {
      alert('Fungsi ini belum disokong sepenuhnya oleh API, tetapi akan mengemaskini status lokal.');
      loadAssignmentStatus();
    }
  };`,
`  const handleResetStatus = async (qid: string) => {
    if (confirm('Adakah anda pasti mahu memadam tugasan ini dari Google Classroom dan set semula status?')) {
      const status = assignmentStatus[qid];
      if (status && status.assignments && token) {
        setLoadingQ(prev => ({ ...prev, [qid]: true }));
        try {
          // Delete from Google Classroom
          for (const a of status.assignments) {
            try {
              await deleteAssignment(token, a.courseId, a.courseWorkId);
            } catch (err) {
              console.error('Error deleting from Classroom:', err);
            }
          }
          // Delete from local DB
          await fetch(\`/api/assignment-status/\${qid}_\${user.email}\`, { method: 'DELETE' });
          alert('Tugasan telah berjaya dipadam dari Google Classroom.');
          loadAssignmentStatus();
        } catch (err: any) {
          alert('Ralat memadam tugasan: ' + err.message);
        } finally {
          setLoadingQ(prev => ({ ...prev, [qid]: false }));
        }
      } else {
        alert('Tugasan tidak dijumpai atau anda perlu log masuk ke Google Classroom semula.');
      }
    }
  };`
);
fs.writeFileSync('src/components/BankSoalan.tsx', code);
