const bump = (version, kind) => {
  const [major, minor, patch] = version.split('.').map(Number);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

console.log('patch:', bump('5.2.1', 'patch'));
console.log('minor:', bump('5.2.1', 'minor'));
console.log('major:', bump('5.2.1', 'major'));
