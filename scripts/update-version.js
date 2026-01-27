import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

try {
    const commitCount = execSync('git rev-list --count HEAD').toString().trim();
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const versionData = {
        version: `1.0.${commitCount}`,
        commit: commitHash,
        date: new Date().toISOString()
    };

    const versionPath = path.resolve('./public/version.json');
    fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
    console.log(`Updated version.json: ${versionData.version}`);
} catch (error) {
    console.error('Failed to generate version.json', error);
    // Fallback if git is not available
    const fallback = { version: '1.0.0-dev', commit: 'unknown' };
    fs.writeFileSync(path.resolve('./public/version.json'), JSON.stringify(fallback));
}
