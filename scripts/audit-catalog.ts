import { WORKS } from '../src/data/works';

const ciWorks = WORKS.filter((work) => work.genre === '词');
const tuneNames = new Set(ciWorks
  .map((work) => work.title.split(/[·・]/)[0]?.trim())
  .filter((name): name is string => Boolean(name)));

const unresolvedAliasTitles = ciWorks.filter((work) => {
  const parts = work.title.split(/[·・]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2 || parts[0] === parts[1] || !tuneNames.has(parts[1])) return false;
  const firstLine = (work.lines[0] ?? '').replace(/[，。！？；：、,.!?;:]+$/g, '');
  return parts[1] !== firstLine;
});

const incompleteWorks = WORKS.filter((work) => work.incomplete);
const report = {
  totalWorks: WORKS.length,
  ciWorks: ciWorks.length,
  unresolvedAliasTitles: unresolvedAliasTitles.length,
  incompleteWorks: incompleteWorks.length,
  unresolvedExamples: unresolvedAliasTitles.slice(0, 20).map((work) => `${work.title} | ${work.author}`),
};

console.log(JSON.stringify(report, null, 2));
if (unresolvedAliasTitles.length > 0) process.exitCode = 1;
