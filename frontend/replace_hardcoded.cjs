const fs = require('fs');

function replaceInFile(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    for (let r of replacements) {
        content = content.replace(r.search, r.replace);
    }
    fs.writeFileSync(file, content);
}

replaceInFile('src/pages/rca/MiniRcaModal.tsx', [
    {
        search: /user\?\.department_id \? `หน่วยที่ \$\{user\.department_id\}` : 'ศูนย์บริหารความเสี่ยง'/g,
        replace: "user?.department_name || (user?.department_id ? `หน่วยที่ ${user.department_id}` : 'ศูนย์บริหารความเสี่ยง')"
    },
    {
        search: /incident\.department_id \? `หน่วยที่ \$\{incident\.department_id\}` : ''/g,
        replace: "incident.department_name || (incident.department_id ? `หน่วยที่ ${incident.department_id}` : '')"
    },
    {
        search: /incident\.department_id \? `หน่วยที่ \$\{incident\.department_id\}` : '-'/g,
        replace: "incident.department_name || (incident.department_id ? `หน่วยที่ ${incident.department_id}` : '-')"
    }
]);

replaceInFile('src/pages/TriggerToolReview.tsx', [
    {
        search: /user\?\.department_id \? `หน่วยที่ \$\{user\.department_id\}` : 'กลุ่มงานการพยาบาล'/g,
        replace: "user?.department_name || (user?.department_id ? `หน่วยที่ ${user.department_id}` : 'กลุ่มงานการพยาบาล')"
    }
]);

console.log('done');
