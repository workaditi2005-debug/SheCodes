/**
 * gameContent.js — Multilingual & Cultural Cognitive Game Content
 * ===============================================================
 * Cultural symbols from North Eastern Region & everyday household items,
 * designed with high clarity and contrast for elderly dementia patients.
 */

// ── 1. Memory Match Content Pools ─────────────────────────────────────────────
export const MEMORY_MATCH_POOLS = {
  // Culturally familiar items (North East India & everyday heritage)
  items: [
    { id: "tea", icon: "☕", label: { en: "Assam Tea", as: "অসম চাহ" }, color: "#d97706" },
    { id: "japi", icon: "👒", label: { en: "Traditional Japi", as: "জাপি" }, color: "#eab308" },
    { id: "rhino", icon: "🦏", label: { en: "Kaziranga Rhino", as: "এশিঙীয়া গঁড়" }, color: "#10b981" },
    { id: "dhol", icon: "🥁", label: { en: "Bihu Dhol", as: "বিহু ঢোল" }, color: "#f43f5e" },
    { id: "lotus", icon: "🪷", label: { en: "Lotus Flower", as: "পদুম ফুল" }, color: "#ec4899" },
    { id: "flute", icon: "🪈", label: { en: "Bamboo Flute", as: "বাঁহী" }, color: "#8b5cf6" },
    { id: "bell", icon: "🔔", label: { en: "Temple Bell", as: "কাঁহৰ ঘণ্টা" }, color: "#eab308" },
    { id: "fish", icon: "🐟", label: { en: "Fresh River Fish", as: "নৈৰ মাছ" }, color: "#06b6d4" },
    { id: "lamp", icon: "🪔", label: { en: "Clay Diya Lamp", as: "মাটিৰ চাকি" }, color: "#f97316" },
    { id: "peacock", icon: "🦚", label: { en: "Peacock", as: "ময়ূৰ" }, color: "#3b82f6" },
    { id: "gamosa", icon: "🧣", label: { en: "Traditional Gamosa", as: "গামোচা" }, color: "#ef4444" },
    { id: "hornbill", icon: "🐦", label: { en: "Hornbill Bird", as: "ধনেশ পক্ষী" }, color: "#10b981" },
  ],
};
export const CULTURAL_ITEMS = MEMORY_MATCH_POOLS.items;


// ── 2. Sequence Recall Content ────────────────────────────────────────────────
export const SEQUENCE_RECALL_PALETTE = [
  { id: "emerald", name: "Green", icon: "🌿", color: "#10b981", soundFreq: 261.63 }, // C4
  { id: "gold", name: "Yellow", icon: "☀️", color: "#f59e0b", soundFreq: 329.63 },    // E4
  { id: "ruby", name: "Red", icon: "🌺", color: "#f43f5e", soundFreq: 392.00 },       // G4
  { id: "sapphire", name: "Blue", icon: "💧", color: "#3b82f6", soundFreq: 523.25 },  // C5
];

// ── 3. Object Recognition Questions ──────────────────────────────────────────
export const OBJECT_RECOGNITION_QUESTIONS = [
  {
    id: "obj-1",
    image: "👒",
    hint: { en: "Traditional woven conical hat worn in Assam.", as: "অসমৰ ঐতিহ্যবাহী বাঁহৰ টুপি।" },
    question: { en: "What is this traditional hat called?", as: "এই পৰম্পৰাগত টুপীটোক কি বুলি কোৱা হয়?" },
    options: [
      { text: { en: "Japi (জাপি)", as: "জাপি" }, correct: true },
      { text: { en: "Paguri (পাগুৰি)", as: "পাগুৰি" }, correct: false },
      { text: { en: "Umbrella (ছাতি)", as: "ছাতি" }, correct: false },
    ],
  },
  {
    id: "obj-2",
    image: "☕",
    hint: { en: "World-famous warm drink brewed in Assam hills.", as: "অসমৰ বাগিচাত উৎপাদিত বিশ্ববিখ্যাত গৰম পানীয়।" },
    question: { en: "What is in this morning cup?", as: "এই পুৱাৰ কাপটোত কি আছে?" },
    options: [
      { text: { en: "Assam Tea (অসম চাহ)", as: "অসম চাহ" }, correct: true },
      { text: { en: "Cold Juice (জুচ)", as: "জুচ" }, correct: false },
      { text: { en: "Water (পানী)", as: "পানী" }, correct: false },
    ],
  },
  {
    id: "obj-3",
    image: "🦏",
    hint: { en: "Pride animal of Kaziranga National Park.", as: "কাজিৰঙা ৰাষ্ট্ৰীয় উদ্যানৰ গৌৰৱ।" },
    question: { en: "Which famous animal is this?", as: "এইটো কোনটো প্ৰসিদ্ধ জন্তু?" },
    options: [
      { text: { en: "One-horned Rhino (এশিঙীয়া গঁড়)", as: "এশিঙীয়া গঁড়" }, correct: true },
      { text: { en: "Bengal Tiger (বাঘ)", as: "বাঘ" }, correct: false },
      { text: { en: "Wild Elephant (হাতী)", as: "হাতী" }, correct: false },
    ],
  },
  {
    id: "obj-4",
    image: "🥁",
    hint: { en: "Musical instrument beaten during spring Bihu festival.", as: "ৰঙালী বিহু উৎসৱত বজোৱা বাদ্যযন্ত্ৰ।" },
    question: { en: "What instrument is this?", as: "এইটো কি বাদ্যযন্ত্ৰ?" },
    options: [
      { text: { en: "Bihu Dhol (বিহু ঢোল)", as: "বিহু ঢোল" }, correct: true },
      { text: { en: "Guitar (গীটাৰ)", as: "গীটাৰ" }, correct: false },
      { text: { en: "Harmonium (হাৰমনিয়াম)", as: "হাৰমনিয়াম" }, correct: false },
    ],
  },
  {
    id: "obj-5",
    image: "🪔",
    hint: { en: "Lighted in the prayer room and during Kati Bihu.", as: "নামঘৰ আৰু কাতি বিহুৰ সময়ত জ্বলোৱা হয়।" },
    question: { en: "What object is this light?", as: "এই পোহৰ বিলোৱা বস্তুটো কি?" },
    options: [
      { text: { en: "Clay Diya (মাটিৰ চাকি)", as: "মাটিৰ চাকি" }, correct: true },
      { text: { en: "Electric Bulb (বাল্ব)", as: "বাল্ব" }, correct: false },
      { text: { en: "Torch (টৰ্চ)", as: "টৰ্চ" }, correct: false },
    ],
  },
  {
    id: "obj-6",
    image: "🪷",
    hint: { en: "Sacred pink flower growing in village ponds.", as: "পৰম্পৰাগত পুখুৰীত গজা পবিত্ৰ পদুম ফুল।" },
    question: { en: "Which sacred flower is shown here?", as: "ইয়াৰে কোনটো পবিত্ৰ ফুল?" },
    options: [
      { text: { en: "Lotus Flower (পদুম ফুল)", as: "পদুম ফুল" }, correct: true },
      { text: { en: "Rose (গোলাপ)", as: "গোলাপ" }, correct: false },
      { text: { en: "Sunflower (সূৰ্যমুখী)", as: "সূৰ্যমুখী" }, correct: false },
    ],
  },
  {
    id: "obj-7",
    image: "🪈",
    hint: { en: "Traditional bamboo wind instrument with melodic tone.", as: "সুৰীয়া বাঁহৰ পৰম্পৰাগত বাদ্যযন্ত্ৰ।" },
    question: { en: "Which musical instrument is this?", as: "এইটো কি সুৰীয়া বাদ্যযন্ত্ৰ?" },
    options: [
      { text: { en: "Bamboo Flute (বাঁহী)", as: "বাঁহী" }, correct: true },
      { text: { en: "Violin (বেহালা)", as: "বেহালা" }, correct: false },
      { text: { en: "Drum (ঢোল)", as: "ঢোল" }, correct: false },
    ],
  },
  {
    id: "obj-8",
    image: "🐟",
    hint: { en: "Fresh catch from the Brahmaputra river.", as: "ব্ৰহ্মপুত্ৰ নদীৰ সতেজ মাছ।" },
    question: { en: "What natural item is depicted here?", as: "ইয়াত কি নদীৰ বস্তু দেখুওৱা হৈছে?" },
    options: [
      { text: { en: "Fresh River Fish (নৈৰ মাছ)", as: "নৈৰ মাছ" }, correct: true },
      { text: { en: "Duck (হাঁহ)", as: "হাঁহ" }, correct: false },
      { text: { en: "Turtle (কাচ্ছপ)", as: "কাচ্ছপ" }, correct: false },
    ],
  },
  {
    id: "obj-9",
    image: "🔔",
    hint: { en: "Rung every morning in community prayer halls.", as: "নামঘৰ আৰু মন্দিৰত পুৱা বজোৱা কাঁহৰ ঘণ্টা।" },
    question: { en: "What temple instrument is this?", as: "এইটো নামঘৰৰ কি বস্তু?" },
    options: [
      { text: { en: "Temple Bell (কাঁহৰ ঘণ্টা)", as: "কাঁহৰ ঘণ্টা" }, correct: true },
      { text: { en: "Clock (ঘড়ী)", as: "ঘড়ী" }, correct: false },
      { text: { en: "Whistle (বংশী)", as: "বংশী" }, correct: false },
    ],
  },
];

// ── 4. Pattern Completion Puzzles ─────────────────────────────────────────────
export const PATTERN_COMPLETION_PUZZLES = [
  {
    id: "pat-1",
    type: "alternate",
    prompt: { en: "What comes next in the pattern?", as: "ক্ৰম অনুসৰি পৰৱৰ্তী বস্তুটো কি হ'ব?" },
    sequence: ["☀️", "🌙", "☀️", "🌙", "?"],
    options: [
      { icon: "☀️", label: { en: "Sun", as: "সূৰ্য" }, correct: true },
      { icon: "⭐", label: { en: "Star", as: "তৰা" }, correct: false },
      { icon: "☁️", label: { en: "Cloud", as: "ডাৱৰ" }, correct: false },
    ],
  },
  {
    id: "pat-2",
    type: "growth",
    prompt: { en: "Which plant completes the growth?", as: "গছৰ বৃদ্ধি অনুসৰি খালী ঠাইত কি বহিব?" },
    sequence: ["🌱", "🌿", "🌳", "?"],
    options: [
      { icon: "🍎", label: { en: "Fruit", as: "ফল" }, correct: true },
      { icon: "🪨", label: { en: "Stone", as: "শিল" }, correct: false },
      { icon: "🌊", label: { en: "River", as: "নদী" }, correct: false },
    ],
  },
  {
    id: "pat-3",
    type: "pairing",
    prompt: { en: "Flower needs what from the sky?", as: "ফুলজোপাৰ বৃদ্ধিৰ বাবে কি প্ৰয়োজন?" },
    sequence: ["🌱", "🌧️", "🪷", "🌧️", "?"],
    options: [
      { icon: "🪷", label: { en: "Lotus", as: "পদুম" }, correct: true },
      { icon: "🔥", label: { en: "Fire", as: "জুই" }, correct: false },
      { icon: "🪓", label: { en: "Axe", as: "কুঠাৰ" }, correct: false },
    ],
  },
  {
    id: "pat-4",
    type: "shapes",
    prompt: { en: "Which shape completes the sequence?", as: "কোনটো ৰূপে এই ক্ৰম সম্পূৰ্ণ কৰে?" },
    sequence: ["🔴", "🔵", "🔴", "🔵", "?"],
    options: [
      { icon: "🔴", label: { en: "Red Circle", as: "ৰঙা বৃত্ত" }, correct: true },
      { icon: "🟢", label: { en: "Green Circle", as: "সেউজীয়া বৃত্ত" }, correct: false },
      { icon: "🟡", label: { en: "Yellow Circle", as: "হালধীয়া বৃত্ত" }, correct: false },
    ],
  },
  {
    id: "pat-5",
    type: "weather",
    prompt: { en: "What weather symbol completes the pattern?", as: "বতৰৰ কোনটো চিহ্নই ক্ৰম সম্পূৰ্ণ কৰিব?" },
    sequence: ["☀️", "🌧️", "☀️", "🌧️", "?"],
    options: [
      { icon: "☀️", label: { en: "Sun", as: "সূৰ্য" }, correct: true },
      { icon: "❄️", label: { en: "Snow", as: "বৰফ" }, correct: false },
      { icon: "🌪️", label: { en: "Wind", as: "বতাহ" }, correct: false },
    ],
  },
  {
    id: "pat-6",
    type: "music",
    prompt: { en: "Which instrument comes next in rhythm?", as: "তাল অনুসৰি পৰৱৰ্তী বাদ্যযন্ত্ৰ কি?" },
    sequence: ["🥁", "🪈", "🥁", "🪈", "?"],
    options: [
      { icon: "🥁", label: { en: "Dhol", as: "ঢোল" }, correct: true },
      { icon: "🔔", label: { en: "Bell", as: "ঘণ্টা" }, correct: false },
      { icon: "🎸", label: { en: "Guitar", as: "গীটাৰ" }, correct: false },
    ],
  },
  {
    id: "pat-7",
    type: "animals",
    prompt: { en: "Which animal completes this wildlife pattern?", as: "কোনটো প্ৰাণীয়ে এই ক্ৰম পূৰ্ণ কৰে?" },
    sequence: ["🦏", "🦚", "🦏", "🦚", "?"],
    options: [
      { icon: "🦏", label: { en: "Rhino", as: "গঁড়" }, correct: true },
      { icon: "🐘", label: { en: "Elephant", as: "হাতী" }, correct: false },
      { icon: "🐅", label: { en: "Tiger", as: "বাঘ" }, correct: false },
    ],
  },
  {
    id: "pat-8",
    type: "lights",
    prompt: { en: "Which light symbol completes the pattern?", as: "কোনটো পোহৰৰ চিহ্নই ক্ৰম সম্পূৰ্ণ কৰিব?" },
    sequence: ["🪔", "⭐", "🪔", "⭐", "?"],
    options: [
      { icon: "🪔", label: { en: "Diya", as: "চাকি" }, correct: true },
      { icon: "⚡", label: { en: "Lightning", as: "বিজুলী" }, correct: false },
      { icon: "🔥", label: { en: "Fire", as: "জুই" }, correct: false },
    ],
  },
];

// ── 5. Daily Routine Activities ───────────────────────────────────────────────
export const DAILY_ROUTINE_TASKS = [
  {
    id: "step-1",
    icon: "🌅",
    title: { en: "Wake Up & Wash", as: "শয্যা ত্যাগ আৰু মুখ ধোৱা" },
    timeHint: "06:30 AM",
    order: 1,
    desc: { en: "Start the fresh morning", as: "নতুন দিনটোৰ আৰম্ভণি" },
  },
  {
    id: "step-2",
    icon: "☕",
    title: { en: "Morning Tea & Pill", as: "ৰাতিপুৱাৰ চাহ আৰু ঔষধ" },
    timeHint: "07:30 AM",
    order: 2,
    desc: { en: "Warm tea and prescribed morning pills", as: "গৰম চাহ আৰু পুৱাৰ ঔষধ" },
  },
  {
    id: "step-3",
    icon: "🚿",
    title: { en: "Bath & Fresh Clothes", as: "গা ধোৱা আৰু পৰিষ্কাৰ কাপোৰ" },
    timeHint: "09:30 AM",
    order: 3,
    desc: { en: "Stay fresh and comfortable", as: "পৰিষ্কাৰ আৰু সুস্থ হৈ থকা" },
  },
  {
    id: "step-4",
    icon: "🍲",
    title: { en: "Nutritious Lunch", as: "দুপৰীয়াৰ আহাৰ" },
    timeHint: "01:00 PM",
    order: 4,
    desc: { en: "Freshly cooked warm meal", as: "গৰম ভাত আৰু আঞ্জা" },
  },
  {
    id: "step-5",
    icon: "🚶",
    title: { en: "Evening Garden Walk", as: "গধূলিৰ খোজ কঢ়া" },
    timeHint: "05:00 PM",
    order: 5,
    desc: { en: "Gentle walk and fresh air", as: "মুকলি বতাহত খোজ কঢ়া" },
  },
  {
    id: "step-6",
    icon: "🌙",
    title: { en: "Dinner & Sleep", as: "ৰাতিৰ আহাৰ আৰু বিশ্ৰাম" },
    timeHint: "09:30 PM",
    order: 6,
    desc: { en: "Peaceful rest for tomorrow", as: "শান্তিপূৰ্ণ নিদ্ৰা" },
  },
];

