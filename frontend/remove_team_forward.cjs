const fs = require('fs');
let c = fs.readFileSync('src/pages/IncidentDetail.tsx', 'utf8');

// 1. Remove the "ส่งต่อทีมนำร่วมทบทวน" button
const btnRegex = /<button\s+type="button"\s+onClick=\{\(\) => \{\s+setForwardTargetType\('team'\);\s+setIsForwardModalOpen\(true\);\s+\}\}[\s\S]*?ส่งต่อทีมนำร่วมทบทวน\s+<\/button>/;
c = c.replace(btnRegex, '');

// 2. Hide Type Switcher in Modal
const switcherRegex = /\{\/\*\sType Switcher\s\*\/\}([\s\S]*?)\{\/\*\sDestination Dropdown\s\*\/\}/;
c = c.replace(switcherRegex, '{/* Type Switcher Removed */}\n              {/* Destination Dropdown */}');

// 3. Remove team dropdown
const teamDropdownRegex = /\{forwardTargetType === 'team' \? \([\s\S]*?\) : \(/;
c = c.replace(teamDropdownRegex, '(');

// 4. Default forwardTargetType
c = c.replace(/const \[forwardTargetType, setForwardTargetType\] = useState\<'team' \| 'department'\>\('team'\);/, "const [forwardTargetType, setForwardTargetType] = useState<'team' | 'department'>('department');");

fs.writeFileSync('src/pages/IncidentDetail.tsx', c);
console.log('done');
