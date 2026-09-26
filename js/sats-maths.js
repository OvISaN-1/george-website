/* ===========================================================
   SATs PRACTICE: MATHS
   -----------------------------------------------------------
   Year 6 (KS2) maths, split into the topics the SATs papers
   test. Every question is made up on the spot, so they never
   run out, and each one comes with "how to work it out".

   A question looks like:
     { q, a, type: 'input' | 'choice', options, unit, explain }
   'input' questions are typed in, like the arithmetic paper.
   =========================================================== */
(function () {
  'use strict';

  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  // Numbers the way they're written in the SATs: 12,345 and 3.75
  const num = (n) => {
    const r = Math.round(n * 1e6) / 1e6;
    const [i, d] = String(Math.abs(r)).split('.');
    return (r < 0 ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : '');
  };
  const money = (n) => '£' + (Number.isInteger(n) ? num(n) : n.toFixed(2));
  const plain = (n) => String(Math.round(n * 1e6) / 1e6);

  const input = (q, a, explain, unit) => ({ q, a: plain(a), type: 'input', unit: unit || '', explain });
  // Multiple choice: the right answer plus wrong ones, trickiest first.
  function choice(q, a, wrong, explain) {
    const opts = [String(a)];
    wrong.map(String).forEach((w) => { if (opts.length < 4 && !opts.includes(w)) opts.push(w); });
    return { q, a: String(a), type: 'choice', options: shuffle(opts), explain };
  }

  /* ---------------- Fractions helper ---------------- */
  function frac(n, d) { const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }
  function fracText(f) {
    if (f.d === 1) return String(f.n);
    if (f.n > f.d) { const w = Math.floor(f.n / f.d), r = f.n % f.d; return r ? `${w} ${r}/${f.d}` : String(w); }
    return `${f.n}/${f.d}`;
  }
  const fracVal = (f) => f.n / f.d;
  // Wrong fraction answers that are really different from the right one.
  function fracWrongs(right, candidates) {
    const seen = new Set([fracVal(right).toFixed(6)]);
    const out = [];
    candidates.forEach((c) => {
      if (!c || c.d <= 0 || c.n <= 0) return;
      const f = frac(c.n, c.d), k = fracVal(f).toFixed(6);
      if (!seen.has(k)) { seen.add(k); out.push(fracText(f)); }
    });
    return out;
  }

  /* ---------------- Words for numbers ---------------- */
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function under1000(n) {
    const h = Math.floor(n / 100), r = n % 100;
    const parts = [];
    if (h) parts.push(`${ONES[h]} hundred`);
    if (r) {
      const t = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : '');
      parts.push(h ? `and ${t}` : t);
    }
    return parts.join(' ');
  }
  function words(n) {
    const m = Math.floor(n / 1e6), th = Math.floor((n % 1e6) / 1000), r = n % 1000;
    const parts = [];
    if (m) parts.push(`${under1000(m)} million`);
    if (th) parts.push(`${under1000(th)} thousand`);
    if (r) parts.push(r < 100 && (m || th) ? `and ${under1000(r)}` : under1000(r));
    return parts.join(' ');
  }

  const COLUMNS = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];

  /* =========================================================
     TOPICS
     ========================================================= */
  const TOPICS = [
    {
      id: 'place', name: 'Place value', emoji: '🔢', paper: 'Reasoning',
      gens: [
        () => {
          let n, digits, i;
          do {
            n = ri(1000000, 9999999);
            digits = String(n).split('').reverse();
            const ok = digits.map((d, k) => k).filter((k) => digits[k] !== '0' && digits.filter((x) => x === digits[k]).length === 1);
            i = ok.length ? pick(ok) : -1;
          } while (i < 0);
          const d = +digits[i], val = d * Math.pow(10, i);
          return input(`What is the value of the digit ${d} in ${num(n)}?`, val,
            `The ${d} is in the ${COLUMNS[i]} column, so it is worth ${d} × ${num(Math.pow(10, i))} = ${num(val)}.`);
        },
        () => {
          const n = pick([ri(1, 9) * 1e6 + ri(0, 99) * 1000 + ri(0, 999), ri(100, 999) * 1000 + ri(1, 99), ri(1, 9) * 1e6 + ri(1, 9) * 1000 + ri(1, 9)]);
          const s = String(n);
          const wrong = [s.replace(/0/, ''), s + '0', s.replace(/(\d)0/, '$1')].map((x) => num(+x)).filter((x) => x !== num(n));
          return choice(`Write this number in figures: ${words(n)}.`, num(n), wrong.concat([num(n + 1000), num(n * 10)]),
            `Split it into millions, thousands and ones. Every group after the millions needs 3 digits, so fill gaps with zeros: ${num(n)}.`);
        },
        () => {
          const base = ri(100000, 900000), step = pick([1000, 10000, 100000]), more = Math.random() < 0.5;
          const ans = more ? base + step : base - step;
          return input(`What is ${num(step)} ${more ? 'more' : 'less'} than ${num(base)}?`, ans,
            `Only the ${COLUMNS[String(step).length - 1]} column changes: ${num(base)} ${more ? '+' : '−'} ${num(step)} = ${num(ans)}.`);
        },
        () => {
          const a = ri(200000, 800000);
          const set = shuffle([a, a + pick([9000, 900, 90]), a - pick([1000, 100]), a + pick([10000, 100000])]);
          const big = Math.max(...set);
          return choice(`Which number is the largest?`, num(big), set.filter((x) => x !== big).map(num),
            `Compare from the left: look at the hundred thousands first, then ten thousands, and so on. ${num(big)} is the largest.`);
        },
      ],
    },
    {
      id: 'rounding', name: 'Rounding', emoji: '🎯', paper: 'Reasoning',
      gens: [
        () => {
          const to = pick([10, 100, 1000, 10000, 100000]);
          let n; do { n = ri(10000, 9999999); } while (n % to === 0);
          const ans = Math.round(n / to) * to;
          const next = n % to, half = to / 2;
          return input(`Round ${num(n)} to the nearest ${num(to)}.`, ans,
            `Look at the digits after the ${num(to)}s: ${num(next)}. ${next >= half ? `That is ${num(half)} or more, so round up` : `That is less than ${num(half)}, so round down`} to ${num(ans)}.`);
        },
        () => {
          const whole = Math.random() < 0.5;
          let n; do { n = ri(1001, 99999) / 100; } while (n * 100 % 10 === 0);
          const ans = whole ? Math.round(n) : Math.round(n * 10) / 10;
          return input(`Round ${num(n)} to ${whole ? 'the nearest whole number' : 'one decimal place'}.`, ans,
            `Look at the ${whole ? 'tenths' : 'hundredths'} digit. 5 or more rounds up, 4 or less rounds down. ${num(n)} rounds to ${num(ans)}.`);
        },
        () => {
          const a = ri(21, 89) * 100 + ri(1, 99), b = ri(11, 49) * 100 + ri(1, 99);
          const est = Math.round(a / 1000) * 1000 + Math.round(b / 1000) * 1000;
          return choice(`Estimate ${num(a)} + ${num(b)} by rounding each number to the nearest 1,000.`, num(est),
            [num(est + 1000), num(est - 1000), num(a + b)],
            `${num(a)} ≈ ${num(Math.round(a / 1000) * 1000)} and ${num(b)} ≈ ${num(Math.round(b / 1000) * 1000)}, so the estimate is ${num(est)}.`);
        },
      ],
    },
    {
      id: 'addsub', name: 'Adding & taking away', emoji: '➕', paper: 'Arithmetic',
      gens: [
        () => { const a = ri(1000, 99999), b = ri(1000, 99999); return input(`${num(a)} + ${num(b)} =`, a + b, `Line the digits up in columns and add from the ones, carrying when a column makes 10 or more. Answer: ${num(a + b)}.`); },
        () => { const a = ri(10000, 99999), b = ri(1000, a - 1); return input(`${num(a)} − ${num(b)} =`, a - b, `Line up the columns and subtract from the ones, exchanging from the next column when the top digit is smaller. Answer: ${num(a - b)}.`); },
        () => { const t = pick([1000, 10000, 100000]), b = ri(t / 10, t - 1); return input(`☐ + ${num(b)} = ${num(t)}`, t - b, `Find the missing number by taking away: ${num(t)} − ${num(b)} = ${num(t - b)}.`); },
        () => { const a = ri(100, 999) / 10, b = ri(100, 999) / 100; return input(`${num(a)} + ${num(b)} =`, a + b, `Line up the decimal points (write ${num(a)} as ${a.toFixed(2)}), then add. Answer: ${num(a + b)}.`); },
        () => { const a = ri(5, 20), b = ri(101, 999) / 100; return input(`${a} − ${num(b)} =`, a - b, `Write ${a} as ${a}.00 so the decimal points line up, then subtract. Answer: ${num(a - b)}.`); },
      ],
    },
    {
      id: 'multdiv', name: 'Multiplying & dividing', emoji: '✖️', paper: 'Arithmetic',
      gens: [
        () => { const a = ri(1000, 9999), b = ri(12, 89); return input(`${num(a)} × ${b} =`, a * b, `Long multiplication: ${num(a)} × ${b % 10} = ${num(a * (b % 10))}, and ${num(a)} × ${b - b % 10} = ${num(a * (b - b % 10))}. Add them: ${num(a * b)}.`); },
        () => { const a = ri(100, 999), b = ri(3, 9); return input(`${a} × ${b} =`, a * b, `Short multiplication, from the ones up, carrying as you go. Answer: ${num(a * b)}.`); },
        () => { const b = ri(3, 9), ans = ri(120, 1999); return input(`${num(ans * b)} ÷ ${b} =`, ans, `Short division (bus stop): divide each digit by ${b} from the left, carrying remainders. Check: ${num(ans)} × ${b} = ${num(ans * b)}.`); },
        () => { const b = ri(11, 25), ans = ri(12, 99); return input(`${num(ans * b)} ÷ ${b} =`, ans, `Long division. Tip: write out the ${b} times table first (${b}, ${2 * b}, ${3 * b}...). Check: ${ans} × ${b} = ${num(ans * b)}.`); },
        () => {
          const p = pick([10, 100, 1000]), x = ri(11, 9999) / 100, mul = Math.random() < 0.5;
          const ans = mul ? x * p : x / p;
          return input(`${num(x)} ${mul ? '×' : '÷'} ${num(p)} =`, ans, `${mul ? 'Multiplying' : 'Dividing'} by ${num(p)} moves every digit ${String(p).length - 1} place${p > 10 ? 's' : ''} to the ${mul ? 'left' : 'right'}. Answer: ${num(ans)}.`);
        },
        () => { const a = ri(2, 12), b = ri(2, 12), c = pick([10, 100]); return input(`${a * c} × ${b} =`, a * b * c, `Use your times tables: ${a} × ${b} = ${a * b}, and ${a * c} is ${c} times bigger, so the answer is ${num(a * b * c)}.`); },
      ],
    },
    {
      id: 'fractions', name: 'Fractions', emoji: '🍕', paper: 'Both papers',
      gens: [
        () => {
          const d = pick([6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24]); let n; do { n = ri(2, d - 1); } while (gcd(n, d) === 1);
          const r = frac(n, d);
          return choice(`Write ${n}/${d} in its simplest form.`, fracText(r), fracWrongs(r, [{ n: n / 2, d }, { n: r.n + 1, d: r.d }, { n, d: d / gcd(n, d) + 1 }, { n: r.n, d: r.d + 1 }]),
            `Divide the top and bottom by their highest common factor, ${gcd(n, d)}: ${n} ÷ ${gcd(n, d)} = ${r.n}, ${d} ÷ ${gcd(n, d)} = ${r.d}.`);
        },
        () => {
          const [b, d] = pick([[2, 3], [3, 4], [2, 5], [4, 6], [3, 5], [4, 5], [2, 7], [3, 8], [5, 6], [4, 10]]);
          const a = ri(1, b - 1), c = ri(1, d - 1), sub = Math.random() < 0.5 && a / b > c / d;
          const r = frac(sub ? a * d - c * b : a * d + c * b, b * d);
          return choice(`${a}/${b} ${sub ? '−' : '+'} ${c}/${d} =`, fracText(r),
            fracWrongs(r, [{ n: sub ? Math.abs(a - c) || 1 : a + c, d: sub ? Math.abs(b - d) || 1 : b + d }, { n: r.n + 1, d: r.d }, { n: sub ? a * d + c * b : Math.abs(a * d - c * b) || 1, d: b * d }, { n: r.n, d: r.d * 2 }]),
            `Make the bottoms the same first: ${a}/${b} = ${a * d}/${b * d} and ${c}/${d} = ${c * b}/${b * d}. Then ${sub ? 'take away' : 'add'} the tops: ${sub ? a * d - c * b : a * d + c * b}/${b * d}${fracText(r) !== `${sub ? a * d - c * b : a * d + c * b}/${b * d}` ? ` = ${fracText(r)}` : ''}.`);
        },
        () => {
          const d = pick([3, 4, 5, 6, 8, 10]), n = ri(1, d - 1), amount = d * ri(3, 15);
          return input(`What is ${n}/${d} of ${amount}?`, amount / d * n, `Divide by the bottom, multiply by the top: ${amount} ÷ ${d} = ${amount / d}, then × ${n} = ${amount / d * n}.`);
        },
        () => {
          const a = ri(1, 4), b = ri(a + 1, 6), c = ri(1, 4), d = ri(c + 1, 7), r = frac(a * c, b * d);
          return choice(`${a}/${b} × ${c}/${d} =`, fracText(r), fracWrongs(r, [{ n: a + c, d: b + d }, { n: a * d, d: b * c }, { n: r.n + 1, d: r.d }, { n: r.n, d: r.d + 1 }]),
            `Multiply the tops (${a} × ${c} = ${a * c}) and the bottoms (${b} × ${d} = ${b * d}), then simplify: ${fracText(r)}.`);
        },
        () => {
          const d = pick([2, 3, 4, 5, 8]), n = ri(1, d - 1), w = ri(2, 5), r = frac(n, d * w);
          return choice(`${n}/${d} ÷ ${w} =`, fracText(r), fracWrongs(r, [{ n: n * w, d }, { n, d: d + w }, { n: n * w, d: d * w }, { n: r.n, d: r.d * 2 }]),
            `Dividing by ${w} makes each part ${w} times smaller, so multiply the bottom by ${w}: ${n}/${d * w}${r.d !== d * w ? ` = ${fracText(r)}` : ''}.`);
        },
        () => {
          const d = pick([3, 4, 5, 6, 8]), w = ri(1, 4); let r; do { r = ri(1, d - 1); } while (gcd(r, d) !== 1);
          const n = w * d + r;
          return choice(`Write ${n}/${d} as a mixed number.`, fracText({ n, d }), [`${w + 1} ${n % d}/${d}`, `${w} ${d - n % d}/${d}`, `${w} ${n % d}/${n}`, `${Math.floor(n / 10) || 1} ${n % 10}/${d}`].filter((x) => x !== fracText({ n, d })),
            `How many whole ${d}s go into ${n}? ${w}, with ${n % d} left over. So ${n}/${d} = ${w} ${n % d}/${d}.`);
        },
        () => {
          const fs = shuffle([[1, 2], [2, 3], [3, 4], [3, 5], [5, 8], [7, 10], [4, 9], [5, 6], [2, 5]]).slice(0, 4);
          const big = fs.reduce((m, f) => (f[0] / f[1] > m[0] / m[1] ? f : m));
          return choice(`Which fraction is the largest?`, `${big[0]}/${big[1]}`, fs.filter((f) => f !== big).map((f) => `${f[0]}/${f[1]}`),
            `Turn them into decimals or give them the same bottom number: ${fs.map((f) => `${f[0]}/${f[1]} = ${num(Math.round(f[0] / f[1] * 100) / 100)}`).join(', ')}.`);
        },
      ],
    },
    {
      id: 'decimals', name: 'Decimals', emoji: '🔟', paper: 'Both papers',
      gens: [
        () => { const a = ri(11, 99) / 10, b = ri(3, 9); return input(`${num(a)} × ${b} =`, a * b, `Work out ${Math.round(a * 10)} × ${b} = ${Math.round(a * 10) * b}, then put the decimal point back (one decimal place): ${num(a * b)}.`); },
        () => {
          const vals = shuffle([ri(100, 999) / 1000, ri(10, 99) / 100, ri(1, 9) / 10, ri(100, 999) / 1000]).map((x) => Math.round(x * 1000) / 1000);
          const uniq = [...new Set(vals)];
          const small = Math.min(...uniq);
          return choice(`Which is the smallest?`, num(small), uniq.filter((x) => x !== small).map(num).concat([num(small + 0.5)]),
            `Give them all the same number of decimal places (${uniq.map((v) => v.toFixed(3)).join(', ')}) and compare. The smallest is ${num(small)}.`);
        },
        () => {
          const [n, d, dec] = pick([[1, 2, 0.5], [1, 4, 0.25], [3, 4, 0.75], [1, 5, 0.2], [2, 5, 0.4], [3, 5, 0.6], [4, 5, 0.8], [1, 10, 0.1], [7, 10, 0.7], [1, 8, 0.125], [3, 8, 0.375], [9, 20, 0.45], [7, 25, 0.28]]);
          return choice(`Write ${n}/${d} as a decimal.`, num(dec), [num(n / 10), `${n}.${d}`, num(dec * 10), num(Math.round((1 - dec) * 1000) / 1000)].filter((x) => x !== num(dec)),
            `Make the bottom 10, 100 or 1,000, or divide ${n} by ${d}: ${n}/${d} = ${num(dec)}.`);
        },
        () => { const a = ri(1, 9) + ri(1, 99) / 100, b = ri(1, 9) + ri(1, 9) / 10; return input(`${num(a)} + ${num(b)} + ${num(b + 1)} =`, a + b + b + 1, `Line up all the decimal points and add column by column. Answer: ${num(a + b + b + 1)}.`); },
      ],
    },
    {
      id: 'percentages', name: 'Percentages', emoji: '💯', paper: 'Both papers',
      gens: [
        () => {
          const p = pick([10, 20, 25, 30, 40, 50, 60, 75, 5, 15, 35, 45, 1]), n = pick([20, 40, 60, 80, 120, 200, 240, 300, 360, 400, 500]);
          const ans = p * n / 100;
          return input(`${p}% of ${n} =`, ans, `Find 10% first (${n} ÷ 10 = ${num(n / 10)}) or 1% (${num(n / 100)}), then build up to ${p}%: ${num(ans)}.`);
        },
        () => {
          const [f, pc] = pick([['1/2', 50], ['1/4', 25], ['3/4', 75], ['1/5', 20], ['2/5', 40], ['3/5', 60], ['1/10', 10], ['3/10', 30], ['7/10', 70], ['1/20', 5], ['9/20', 45], ['6/25', 24]]);
          return choice(`Write ${f} as a percentage.`, `${pc}%`, [`${pc / 10}%`, `${f.split('/')[0]}%`, `${pc + 10}%`, `${100 - pc}%`].filter((x) => x !== `${pc}%`),
            `Per cent means "out of 100". Make the bottom 100: ${f} = ${pc}/100 = ${pc}%.`);
        },
        () => {
          const price = pick([20, 40, 60, 80, 120, 160, 200]), p = pick([10, 20, 25, 50]), ans = price * (100 - p) / 100;
          return input(`A bike costs £${price}. In a sale it is ${p}% off. What is the sale price?`, ans, `${p}% of £${price} is £${num(price * p / 100)}. Take it off: £${price} − £${num(price * p / 100)} = £${num(ans)}.`, '£');
        },
        () => {
          const total = pick([20, 25, 40, 50]), got = ri(Math.ceil(total / 4), total - 1), pc = got / total * 100;
          if (!Number.isInteger(pc)) return TOPICS_BY_ID.percentages.gens[0]();
          return input(`George got ${got} out of ${total} in a test. What percentage is that?`, pc, `Scale it to "out of 100": ${got}/${total} = ${pc}/100 = ${pc}%.`, '%');
        },
      ],
    },
    {
      id: 'ratio', name: 'Ratio & proportion', emoji: '⚖️', paper: 'Reasoning',
      gens: [
        () => {
          const a = ri(1, 4), b = ri(a + 1, 7), k = ri(3, 12), total = (a + b) * k;
          return input(`£${total} is shared between Sam and Ali in the ratio ${a} : ${b}. How much does Ali get?`, b * k,
            `There are ${a} + ${b} = ${a + b} parts. One part is £${total} ÷ ${a + b} = £${k}. Ali gets ${b} parts: ${b} × £${k} = £${b * k}.`, '£');
        },
        () => {
          const people = pick([2, 4, 5]), g = pick([100, 150, 200, 250, 300]), want = pick([3, 6, 8, 10].filter((x) => x !== people));
          const ans = g / people * want;
          if (!Number.isInteger(ans)) return TOPICS_BY_ID.ratio.gens[2]();
          return input(`A recipe for ${people} people uses ${g} g of flour. How much flour is needed for ${want} people?`, ans,
            `Find it for 1 person: ${g} ÷ ${people} = ${num(g / people)} g. Then for ${want} people: ${num(g / people)} × ${want} = ${num(ans)} g.`, 'g');
        },
        () => {
          const r = ri(2, 4), bl = ri(r + 1, 7), k = ri(2, 6);
          return input(`In a bag, for every ${r} red sweets there are ${bl} blue sweets. There are ${r * k} red sweets. How many blue sweets are there?`, bl * k,
            `${r * k} red is ${k} lots of ${r}. So there are ${k} lots of ${bl} blue: ${k} × ${bl} = ${bl * k}.`);
        },
        () => {
          const scale = pick([2, 3, 4, 5]), a = ri(2, 9);
          return input(`A shape is enlarged by scale factor ${scale}. One side was ${a} cm. How long is it now?`, a * scale, `Scale factor ${scale} means every length is ${scale} times bigger: ${a} × ${scale} = ${a * scale} cm.`, 'cm');
        },
      ],
    },
    {
      id: 'algebra', name: 'Algebra', emoji: '🔤', paper: 'Reasoning',
      gens: [
        () => { const x = ri(2, 15), a = ri(2, 9), b = ri(1, 30); return input(`${a}n + ${b} = ${a * x + b}. What is n?`, x, `Take away ${b} from both sides: ${a}n = ${a * x}. Then divide by ${a}: n = ${x}.`); },
        () => {
          const s = ri(1, 20), d = pick([3, 4, 5, 6, 7, 9, -3, -4]); const t = [0, 1, 2, 3, 4].map((i) => s + 20 + i * d);
          return input(`What is the next number in this sequence? ${t.slice(0, 4).join(', ')}, …`, t[4], `The sequence goes ${d > 0 ? 'up' : 'down'} by ${Math.abs(d)} each time: ${t[3]} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${t[4]}.`);
        },
        () => { const a = ri(3, 9), b = ri(1, 20), n = ri(3, 12); return input(`The cost of a taxi ride in pounds is ${a}m + ${b}, where m is the number of miles. How much is a ${n}-mile ride?`, a * n + b, `Swap m for ${n}: ${a} × ${n} + ${b} = ${a * n} + ${b} = £${a * n + b}.`, '£'); },
        () => {
          const a = ri(6, 20), b = ri(1, a - 1);
          return input(`a + b = ${a + b} and a − b = ${a - b}. What is a?`, a, `Add the two facts together: (a + b) + (a − b) = 2a = ${2 * a}. So a = ${a}. (And b = ${b}.)`);
        },
        () => {
          const n = ri(3, 30);
          return input(`I think of a number, multiply it by 4 and subtract 7. The answer is ${4 * n - 7}. What was my number?`, n, `Work backwards: add 7 (${4 * n - 7} + 7 = ${4 * n}), then divide by 4: ${n}.`);
        },
      ],
    },
    {
      id: 'measure', name: 'Measurement', emoji: '📏', paper: 'Reasoning',
      gens: [
        () => {
          const [big, small, k] = pick([['km', 'm', 1000], ['kg', 'g', 1000], ['litres', 'ml', 1000], ['m', 'cm', 100], ['cm', 'mm', 10]]);
          const toSmall = Math.random() < 0.5, x = pick([ri(2, 9) + pick([0.5, 0.25, 0.75, 0.1, 0.05]), ri(1, 12)]);
          return toSmall
            ? input(`${num(x)} ${big} = ☐ ${small}`, x * k, `There are ${num(k)} ${small} in 1 ${big.replace(/s$/, '')}, so multiply by ${num(k)}: ${num(x * k)} ${small}.`, small)
            : input(`${num(x * k)} ${small} = ☐ ${big}`, x, `There are ${num(k)} ${small} in 1 ${big.replace(/s$/, '')}, so divide by ${num(k)}: ${num(x)} ${big}.`, big);
        },
        () => { const l = ri(3, 25), w = ri(2, 15), area = Math.random() < 0.5; return area ? input(`A rectangle is ${l} cm long and ${w} cm wide. What is its area?`, l * w, `Area = length × width = ${l} × ${w} = ${l * w} cm².`, 'cm²') : input(`A rectangle is ${l} cm long and ${w} cm wide. What is its perimeter?`, 2 * (l + w), `Perimeter is all the way round: ${l} + ${w} + ${l} + ${w} = ${2 * (l + w)} cm.`, 'cm'); },
        () => { const b = ri(2, 20) * 2, h = ri(3, 15); return input(`A triangle has a base of ${b} cm and a height of ${h} cm. What is its area?`, b * h / 2, `Area of a triangle = base × height ÷ 2 = ${b} × ${h} ÷ 2 = ${b * h / 2} cm².`, 'cm²'); },
        () => { const l = ri(2, 12), w = ri(2, 10), h = ri(2, 10); return input(`A box (cuboid) is ${l} cm by ${w} cm by ${h} cm. What is its volume?`, l * w * h, `Volume = length × width × height = ${l} × ${w} × ${h} = ${l * w * h} cm³.`, 'cm³'); },
        () => { const k = ri(2, 12); return input(`5 miles is about 8 km. About how many km is ${5 * k} miles?`, 8 * k, `${5 * k} miles is ${k} lots of 5 miles, so it is ${k} lots of 8 km: ${8 * k} km.`, 'km'); },
        () => { const h = ri(1, 5), half = pick([0, 0.5, 0.25, 0.75]); return input(`How many minutes are there in ${num(h + half)} hours?`, (h + half) * 60, `1 hour = 60 minutes, so ${num(h + half)} × 60 = ${(h + half) * 60} minutes.`, 'minutes'); },
        () => {
          const sh = ri(9, 18), sm = pick([5, 10, 15, 20, 25, 35, 40, 45, 50, 55]), dh = ri(1, 2), dm = pick([10, 20, 25, 35, 40, 50]);
          const end = sh * 60 + sm + dh * 60 + dm, t = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
          return choice(`A film starts at ${t(sh * 60 + sm)} and lasts ${dh} hour${dh > 1 ? 's' : ''} ${dm} minutes. What time does it finish?`, t(end), [t(end + 60), t(end - 10), t(sh * 60 + sm + dh * 100 + dm)].filter((x) => x !== t(end)),
            `Add the hours first (${t((sh + dh) * 60 + sm)}), then the ${dm} minutes: ${t(end)}.`);
        },
      ],
    },
    {
      id: 'shape', name: 'Shape & angles', emoji: '📐', paper: 'Reasoning',
      gens: [
        () => { const a = ri(15, 165); return input(`Two angles sit on a straight line. One is ${a}°. What is the other?`, 180 - a, `Angles on a straight line add up to 180°: 180 − ${a} = ${180 - a}°.`, '°'); },
        () => { const a = ri(30, 150), b = ri(20, 180 - a - 10); return input(`Two angles in a triangle are ${a}° and ${b}°. What is the third angle?`, 180 - a - b, `Angles in a triangle add up to 180°: 180 − ${a} − ${b} = ${180 - a - b}°.`, '°'); },
        () => { const a = ri(60, 150), b = ri(40, 330 - a - 20), c = 360 - a - b; return input(`Three angles meet at a point: ${a}°, ${b}° and one more. What is the missing angle?`, c, `Angles around a point add up to 360°: 360 − ${a} − ${b} = ${c}°.`, '°'); },
        () => { const top = ri(20, 140) & ~1; return input(`An isosceles triangle has a top angle of ${top}°. The other two angles are equal. What is one of them?`, (180 - top) / 2, `180 − ${top} = ${180 - top}. Share between the two equal angles: ${180 - top} ÷ 2 = ${(180 - top) / 2}°.`, '°'); },
        () => { const [n, name] = pick([[5, 'pentagon'], [6, 'hexagon'], [8, 'octagon'], [4, 'quadrilateral'], [10, 'decagon']]); return input(`What do the inside angles of a ${name} add up to?`, (n - 2) * 180, `A ${name} can be split into ${n - 2} triangles, and each triangle is 180°: ${n - 2} × 180 = ${(n - 2) * 180}°.`, '°'); },
        () => { const r = ri(3, 25), toD = Math.random() < 0.5; return toD ? input(`A circle has a radius of ${r} cm. What is its diameter?`, 2 * r, `The diameter goes all the way across, so it is twice the radius: ${r} × 2 = ${2 * r} cm.`, 'cm') : input(`A circle has a diameter of ${2 * r} cm. What is its radius?`, r, `The radius is half the diameter: ${2 * r} ÷ 2 = ${r} cm.`, 'cm'); },
        () => {
          const [shape, faces, edges, verts] = pick([['cube', 6, 12, 8], ['cuboid', 6, 12, 8], ['triangular prism', 5, 9, 6], ['square-based pyramid', 5, 8, 5], ['triangular-based pyramid (tetrahedron)', 4, 6, 4]]);
          const what = pick([['faces', faces], ['edges', edges], ['vertices', verts]]);
          return choice(`How many ${what[0]} does a ${shape} have?`, what[1], [faces, edges, verts, what[1] + 1, what[1] - 1].filter((x) => x !== what[1]),
            `A ${shape} has ${faces} faces, ${edges} edges and ${verts} vertices (corners).`);
        },
        () => {
          const x = ri(-5, 5), y = ri(-5, 5), dx = ri(-4, 4) || 3, dy = ri(-4, 4) || -2;
          const dir = `${Math.abs(dx)} ${dx < 0 ? 'left' : 'right'} and ${Math.abs(dy)} ${dy < 0 ? 'down' : 'up'}`;
          const c = (a, b) => `(${a}, ${b})`;
          return choice(`The point ${c(x, y)} is moved ${dir}. Where is it now?`, c(x + dx, y + dy), [c(x + dy, y + dx), c(x - dx, y - dy), c(x + dx, y - dy), c(x - dx, y + dy)].filter((v) => v !== c(x + dx, y + dy)),
            `Left/right changes the first number (x), up/down changes the second (y): (${x} ${dx < 0 ? '−' : '+'} ${Math.abs(dx)}, ${y} ${dy < 0 ? '−' : '+'} ${Math.abs(dy)}) = ${c(x + dx, y + dy)}.`);
        },
      ],
    },
    {
      id: 'stats', name: 'Statistics', emoji: '📊', paper: 'Reasoning',
      gens: [
        () => {
          const n = ri(3, 6), mean = ri(4, 30); const vals = Array.from({ length: n - 1 }, () => mean + ri(-4, 4)); vals.push(mean * n - vals.reduce((a, b) => a + b, 0));
          if (vals[n - 1] < 0) return TOPICS_BY_ID.stats.gens[0]();
          return input(`What is the mean of ${shuffle(vals).join(', ')}?`, mean, `Add them up (${mean * n}) and divide by how many there are (${n}): ${mean * n} ÷ ${n} = ${mean}.`);
        },
        () => {
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], v = days.map(() => ri(8, 40)), a = ri(0, 4); let b; do { b = ri(0, 4); } while (b === a || v[a] === v[b]);
          const [hi, lo] = v[a] > v[b] ? [a, b] : [b, a];
          return input(`Goals scored at football club: ${days.map((d, i) => `${d} ${v[i]}`).join(', ')}. How many more goals were scored on ${days[hi]} than on ${days[lo]}?`, v[hi] - v[lo],
            `${days[hi]}: ${v[hi]}, ${days[lo]}: ${v[lo]}. Difference: ${v[hi]} − ${v[lo]} = ${v[hi] - v[lo]}.`);
        },
        () => {
          const total = pick([20, 24, 36, 40, 60, 80, 120]), [f, name, deg] = pick([[1 / 2, 'half', 180], [1 / 4, 'a quarter', 90], [3 / 4, 'three quarters', 270], [1 / 3, 'a third', 120]]);
          if (!Number.isInteger(total * f)) return TOPICS_BY_ID.stats.gens[0]();
          return input(`${total} children chose their favourite sport. On the pie chart, football takes up ${name} of the circle (${deg}°). How many chose football?`, total * f, `${name[0].toUpperCase() + name.slice(1)} of ${total} = ${total * f}.`);
        },
        () => {
          const temps = Array.from({ length: 4 }, () => ri(-6, 14)); const hi = Math.max(...temps), lo = Math.min(...temps);
          if (hi === lo) return TOPICS_BY_ID.stats.gens[1]();
          return input(`The temperatures this week were ${temps.map((t) => `${t}°C`).join(', ')}. What is the difference between the highest and the lowest?`, hi - lo, `Highest ${hi}°C, lowest ${lo}°C. Count from ${lo} up to ${hi}: ${hi - lo} degrees.`, '°C');
        },
      ],
    },
    {
      id: 'number', name: 'Number facts', emoji: '🧠', paper: 'Both papers',
      gens: [
        () => { const a = ri(-9, 5), b = ri(3, 14), op = Math.random() < 0.5; const ans = op ? a + b : a - b; return input(`${a < 0 ? '−' + -a : a} ${op ? '+' : '−'} ${b} =`, ans, `Use a number line: start at ${a} and go ${op ? 'up' : 'down'} ${b}. You land on ${ans < 0 ? '−' + -ans : ans}.`); },
        () => { const n = pick([ri(2, 12), ri(2, 5)]), cube = n <= 5 && Math.random() < 0.5; return input(`${n}${cube ? '³' : '²'} =`, cube ? n ** 3 : n * n, cube ? `${n} cubed means ${n} × ${n} × ${n} = ${n ** 3}.` : `${n} squared means ${n} × ${n} = ${n * n}.`); },
        () => {
          const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
          const p = pick(primes.slice(3)), not = shuffle([9, 15, 21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91]).slice(0, 3);
          return choice(`Which of these is a prime number?`, p, not, `A prime number has exactly two factors: 1 and itself. ${p} is prime. ${not.map((x) => { const f = [3, 7, 11, 13, 17, 19].find((k) => x % k === 0); return `${x} = ${f} × ${x / f}`; }).join(', ')}.`);
        },
        () => { const n = pick([24, 36, 48, 60, 72, 84, 90, 96, 100]); const facs = []; for (let i = 2; i < n; i++) if (n % i === 0) facs.push(i); const f = pick(facs); const wrong = shuffle([5, 7, 9, 11, 13, 14, 16, 18, 22, 25, 26, 27].filter((x) => n % x !== 0)).slice(0, 3);
          return choice(`Which of these is a factor of ${n}?`, f, wrong, `A factor divides exactly with no remainder: ${n} ÷ ${f} = ${n / f}.`); },
        () => { const [a, b] = pick([[12, 18], [16, 24], [15, 25], [18, 27], [20, 30], [24, 36], [14, 21], [30, 45]]); const h = gcd(a, b); return input(`What is the highest common factor of ${a} and ${b}?`, h, `Factors of ${a} and ${b} that match: the biggest one is ${h} (${a} = ${h} × ${a / h}, ${b} = ${h} × ${b / h}).`); },
        () => {
          const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9), kind = ri(0, 3);
          const [q, ans, ex] = [
            [`${a} + ${b} × ${c} =`, a + b * c, `Multiply before you add: ${b} × ${c} = ${b * c}, then + ${a} = ${a + b * c}.`],
            [`(${a} + ${b}) × ${c} =`, (a + b) * c, `Brackets first: ${a} + ${b} = ${a + b}, then × ${c} = ${(a + b) * c}.`],
            [`${b * c + a * 5} − ${b * c} ÷ ${c} =`, b * c + a * 5 - b, `Divide before you subtract: ${b * c} ÷ ${c} = ${b}, then ${b * c + a * 5} − ${b} = ${b * c + a * 5 - b}.`],
            [`${a * 10} − ${b} × ${c} =`, a * 10 - b * c, `Multiply before you subtract: ${b} × ${c} = ${b * c}, then ${a * 10} − ${b * c} = ${a * 10 - b * c}.`],
          ][kind];
          return input(q, ans, ex);
        },
        () => {
          const n = pick([14, 19, 24, 29, 39, 44, 49, 64, 90, 99, 1066, 1492, 1945, 1979, 2026, 2012, 1588]);
          const R = (x) => { const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; m.forEach(([v, r]) => { while (x >= v) { s += r; x -= v; } }); return s; };
          return choice(`What number is ${R(n)}?`, n, [n + 10, n - 1, n + 1, n + 9].filter((x) => x !== n),
            `Add the letters up (M = 1000, D = 500, C = 100, L = 50, X = 10, V = 5, I = 1). A smaller one before a bigger one is taken away (IV = 4, IX = 9, XL = 40, XC = 90, CM = 900). ${R(n)} = ${n}.`);
        },
      ],
    },
  ];
  const TOPICS_BY_ID = {};
  TOPICS.forEach((t) => { TOPICS_BY_ID[t.id] = t; });

  function question(topicId) {
    const t = TOPICS_BY_ID[topicId];
    const q = pick(t.gens)();
    q.topic = topicId;
    return q;
  }

  window.SATS_MATHS = {
    topics: TOPICS.map(({ id, name, emoji, paper }) => ({ id, name, emoji, paper })),
    question,
    num,
  };
})();
