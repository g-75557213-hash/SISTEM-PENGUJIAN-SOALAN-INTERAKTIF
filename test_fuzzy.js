function fuzzyNameMatch(name1, name2) {
  if (!name1 || !name2) return false;
  name1 = name1.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  name2 = name2.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  
  if (name1 === name2) return true;
  if (name1.includes(name2) || name2.includes(name1)) return true;
  
  const words1 = name1.split(/\s+/).filter(w => w.length > 2 && !['bin', 'binti', 'bt', 'b', 'a', 'al'].includes(w));
  const words2 = name2.split(/\s+/).filter(w => w.length > 2 && !['bin', 'binti', 'bt', 'b', 'a', 'al'].includes(w));
  
  let matchCount = 0;
  for (const w1 of words1) {
    if (words2.some(w2 => w2 === w1 || w1.includes(w2) || w2.includes(w1))) {
      matchCount++;
    }
  }
  
  // If at least 2 significant words match, or if one of the names only has 1 significant word and it matches
  const minRequired = Math.min(2, words1.length, words2.length);
  return matchCount >= minRequired && matchCount > 0;
}

console.log(fuzzyNameMatch("siti nurarina binti hassan", "arina bt hassan"));
console.log(fuzzyNameMatch("ahmad lutfi afif bin amarozaimi", "ahmad lutfi"));
console.log(fuzzyNameMatch("nur delisha binti mohd shariman kpm-murid", "delisha shariman"));
