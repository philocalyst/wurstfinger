import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEnding, stemsFor } from '../src/orthography.js';

const CASES = {
  ing: `walk walking | stop stopping | run running | make making | be being | see seeing | lie lying | die dying
    | rap rapping | rape raping | hop hopping | hope hoping | plan planning | plane planing | begin beginning
    | open opening | visit visiting | happen happening | occur occurring | refer referring | prefer preferring
    | forget forgetting | quit quitting | equip equipping | panic panicking | picnic picnicking | fix fixing
    | play playing | snow snowing | travel traveling | listen listening | enter entering | offer offering
    | admit admitting | control controlling | swim swimming | sit sitting | get getting | put putting
    | write writing | come coming | give giving | have having | argue arguing | agree agreeing | dye dyeing
    | text texting | go going | do doing | think thinking | say saying | try trying | study studying
    | rid ridding | ride riding | scrap scrapping | scrape scraping | prop propping | tap tapping | tape taping
    | chat chatting | ship shipping | drop dropping | cut cutting | shop shopping | win winning | email emailing
    | wait waiting | read reading | sleep sleeping | cook cooking | bus busing | upset upsetting`,
  ed: `walk walked | stop stopped | try tried | play played | like liked | go went | do did | have had
    | occur occurred | defer deferred | refer referred | prefer preferred | equip equipped | panic panicked
    | open opened | visit visited | happen happened | plan planned | scrap scrapped | scrape scraped
    | prop propped | drop dropped | text texted | want wanted | need needed | call called | ask asked
    | say said | see saw | get got | make made | think thought | tell told | know knew | take took
    | come came | find found | give gave | feel felt | leave left | keep kept | hear heard | buy bought
    | send sent | run ran | eat ate | write wrote | fix fixed | hurry hurried | enjoy enjoyed | admit admitted
    | listen listened | travel traveled | agree agreed | die died | is was | are were | can could | will would
    | chat chatted | ship shipped | hug hugged | love loved | hope hoped | hop hopped | email emailed
    | cancel canceled | order ordered | quit quit | put put | let let | read read | sleep slept | meet met`,
  s: `cat cats | box boxes | bus buses | try tries | play plays | watch watches | wish wishes | go goes | do does
    | have has | child children | man men | woman women | life lives | wife wives | knife knives | leaf leaves
    | potato potatoes | hero heroes | quiz quizzes | photo photos | piano pianos | baby babies | day days
    | person people | foot feet | tooth teeth | thing things | want wants | know knows | think thinks
    | kiss kisses | fix fixes | buzz buzzes | party parties | key keys | friend friends | text texts`,
  ly: `quick quickly | happy happily | simple simply | basic basically | true truly | full fully | public publicly
    | shy shyly | real really | final finally | easy easily | probable probably | terrible terribly
    | gentle gently | day daily | complete completely | actual actually | quiet quietly | lucky luckily
    | automatic automatically | whole wholly | nice nicely | late lately | slow slowly`,
  er: `fast faster | big bigger | nice nicer | happy happier | good better | bad worse | far farther | late later
    | hot hotter | early earlier | small smaller | work worker | teach teacher | run runner | write writer
    | thin thinner | easy easier | drive driver | win winner | swim swimmer | open opener`,
  "n't": `can can't | will won't | do don't | does doesn't | did didn't | is isn't | are aren't | was wasn't
    | were weren't | have haven't | has hasn't | had hadn't | would wouldn't | could couldn't | should shouldn't
    | must mustn't`,
  "'s": `it it's | that that's | he he's | she she's | i I'm | you you're | we we're | they they're | what what's
    | there there's | mom mom's | let let's | who who's | here here's | sarah sarah's`,
};

for (const [ending, list] of Object.entries(CASES)) {
  test(`${ending}: every base takes the ending the way English spells it`, () => {
    const wrong = [];
    for (const pair of list.split('|')) {
      const [base, want] = pair.trim().split(/\s+/);
      const got = applyEnding(base, ending);
      if (got !== want) wrong.push(`${base} + ${ending} = ${got}, want ${want}`);
    }
    assert.deepEqual(wrong, []);
  });
}

test('casing survives: capitals, acronyms and mixed case keep what was typed', () => {
  assert.equal(applyEnding('Walk', 'ed'), 'Walked');
  assert.equal(applyEnding('NASA', 's'), 'NASAs');
  assert.equal(applyEnding('iPhone', 's'), 'iPhones');
  assert.equal(applyEnding('DM', 'ed'), 'DMed');
  assert.equal(applyEnding('Go', 'ed'), 'Went');
  assert.equal(applyEnding('I', "'s"), "I'm");
  assert.equal(applyEnding('Priya', "'s"), "Priya's");
});

test('stemsFor finds the base of an inflected word, irregulars included', () => {
  for (const [w, ending, base] of [['running', 'ing', 'run'], ['making', 'ing', 'make'], ['tried', 'ed', 'try'],
    ['went', 'ed', 'go'], ['children', 's', 'child'], ['happily', 'ly', 'happy'], ["can't", "n't", 'can'],
    ["you're", "'s", 'you'], ['panicked', 'ed', 'panic'], ['boxes', 's', 'box']]) {
    assert.ok(stemsFor(w, ending).some(s => s === base && applyEnding(s, ending) === w), `${w} = ${base} + ${ending}`);
  }
});
