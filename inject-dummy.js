// ブラウザの開発者ツール Console にペーストして実行してください
// http://localhost:3000 を開いた状態で実行する

const castMasters = [
  { name: "さくら",   imageUrl: "", color: "#f9a8d4" },
  { name: "あおい",   imageUrl: "", color: "#93c5fd" },
  { name: "ひなた",   imageUrl: "", color: "#86efac" },
  { name: "ゆうな",   imageUrl: "", color: "#fcd34d" },
  { name: "れいか",   imageUrl: "", color: "#c4b5fd" },
  { name: "みのり",   imageUrl: "", color: "#fdba74" },
  { name: "ことね",   imageUrl: "", color: "#67e8f9" },
  { name: "あやか",   imageUrl: "", color: "#f9a8d4" },
];

const rankLists = {
  gold:   ["さくら", "あおい"],
  silver: ["ひなた", "ゆうな"],
  bronze: ["れいか", "みのり"],
};

// 2026-02-18 のスケジュール
const schedule = {
  "2026-02-18": [
    { time: "11", casts: [
      { id: "1", name: "さくら",  imageUrl: "", rank: "gold" },
      { id: "2", name: "ひなた",  imageUrl: "", rank: "silver" },
      { id: "3", name: "れいか",  imageUrl: "", rank: "bronze" },
    ]},
    { time: "12", casts: [
      { id: "1", name: "さくら",  imageUrl: "", rank: "gold" },
      { id: "2", name: "ひなた",  imageUrl: "", rank: "silver" },
      { id: "4", name: "ゆうな",  imageUrl: "", rank: "silver" },
      { id: "5", name: "みのり",  imageUrl: "", rank: "bronze" },
    ]},
    { time: "13", casts: [
      { id: "1", name: "さくら",  imageUrl: "", rank: "gold" },
      { id: "6", name: "あおい",  imageUrl: "", rank: "gold" },
      { id: "4", name: "ゆうな",  imageUrl: "", rank: "silver" },
      { id: "5", name: "みのり",  imageUrl: "", rank: "bronze" },
      { id: "7", name: "ことね",  imageUrl: "", rank: "normal" },
    ]},
    { time: "14", casts: [
      { id: "6", name: "あおい",  imageUrl: "", rank: "gold" },
      { id: "2", name: "ひなた",  imageUrl: "", rank: "silver" },
      { id: "4", name: "ゆうな",  imageUrl: "", rank: "silver" },
      { id: "7", name: "ことね",  imageUrl: "", rank: "normal" },
      { id: "8", name: "あやか",  imageUrl: "", rank: "normal" },
    ]},
    { time: "15", casts: [
      { id: "6", name: "あおい",  imageUrl: "", rank: "gold" },
      { id: "3", name: "れいか",  imageUrl: "", rank: "bronze" },
      { id: "7", name: "ことね",  imageUrl: "", rank: "normal" },
      { id: "8", name: "あやか",  imageUrl: "", rank: "normal" },
    ]},
    { time: "16", casts: [
      { id: "1", name: "さくら",  imageUrl: "", rank: "gold" },
      { id: "3", name: "れいか",  imageUrl: "", rank: "bronze" },
      { id: "5", name: "みのり",  imageUrl: "", rank: "bronze" },
      { id: "8", name: "あやか",  imageUrl: "", rank: "normal" },
    ]},
    { time: "17", casts: [
      { id: "1", name: "さくら",  imageUrl: "", rank: "gold" },
      { id: "6", name: "あおい",  imageUrl: "", rank: "gold" },
      { id: "2", name: "ひなた",  imageUrl: "", rank: "silver" },
      { id: "3", name: "れいか",  imageUrl: "", rank: "bronze" },
    ]},
    { time: "18", casts: [
      { id: "6", name: "あおい",  imageUrl: "", rank: "gold" },
      { id: "4", name: "ゆうな",  imageUrl: "", rank: "silver" },
      { id: "5", name: "みのり",  imageUrl: "", rank: "bronze" },
    ]},
  ]
};

localStorage.setItem("cast-masters",    JSON.stringify(castMasters));
localStorage.setItem("rank-lists",      JSON.stringify(rankLists));
localStorage.setItem("multi-schedule",  JSON.stringify(schedule));
localStorage.setItem("schedule-date",   "2/18（水）");

console.log("✅ ダミーデータを注入しました。ページをリロードしてください。");
location.reload();
