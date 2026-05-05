export const HEROES = [
  "Aamon","Akai","Aldous","Alice","Alpha","Alucard","Angela","Argus","Arlott","Atlas",
  "Aulus","Aurora","Badang","Balmond","Bane","Barats","Baxia","Beatrix","Belerick","Benedetta",
  "Brody","Bruno","Carmilla","Cecilion","Chang'e","Chip","Chou","Cici","Claude","Clint",
  "Cyclops","Diggie","Dyrroth","Edith","Esmeralda","Estes","Eudora","Fanny","Faramis","Floryn",
  "Franco","Fredrinn","Freya","Gatotkaca","Gloo","Gord","Granger","Grock","Guinevere","Gusion",
  "Hanabi","Hanzo","Harith","Harley","Hayabusa","Helcurt","Hilda","Hylos","Irithel","Ixia",
  "Jawhead","Johnson","Joy","Julian","Kadita","Kagura","Kaja","Kalea","Karina","Karrie",
  "Khaleed","Khufra","Kimmy","Lancelot","Lapu-Lapu","Layla","Leomord","Lesley","Ling","Lolita",
  "Lukas","Lunox","Luo Yi","Lylia","Marcel","Martis","Masha","Mathilda","Melissa","Minotaur",
  "Minsitthar","Miya","Moskov","Nana","Natalia","Nolan","Obsidia","Odette","Paquito","Pharsa","Phoveus",
  "Popol and Kupa","Rafaela","Roger","Ruby","Saber","Selena","Sora","Suyou","Tamuz","Terizla",
  "Thamuz","Tigreal","Uranus","Valentina","Valir","Vexana","Wanwan","X.Borg","Xavier",
  "Yi Sun-shin","Yin","Yu Zhong","Yve","Zetian","Zhask","Zhuxin"
];

export const HERO_ROLES = {
  "Aamon":"Assassin","Akai":"Tank","Aldous":"Fighter","Alice":"Mage","Alpha":"Fighter",
  "Alucard":"Fighter","Angela":"Support","Argus":"Fighter","Arlott":"Fighter","Atlas":"Tank",
  "Aulus":"Fighter","Aurora":"Mage","Badang":"Fighter","Balmond":"Fighter","Bane":"Fighter",
  "Barats":"Tank","Baxia":"Tank","Beatrix":"Marksman","Belerick":"Tank","Benedetta":"Assassin",
  "Brody":"Marksman","Bruno":"Marksman","Carmilla":"Support","Cecilion":"Mage","Chang'e":"Mage",
  "Chip":"Tank","Chou":"Fighter","Cici":"Fighter","Claude":"Marksman","Clint":"Marksman",
  "Cyclops":"Mage","Diggie":"Support","Dyrroth":"Fighter","Edith":"Tank","Esmeralda":"Mage",
  "Estes":"Support","Eudora":"Mage","Fanny":"Assassin","Faramis":"Support","Floryn":"Support",
  "Franco":"Tank","Fredrinn":"Fighter","Freya":"Fighter","Gatotkaca":"Tank","Gloo":"Tank",
  "Gord":"Mage","Granger":"Marksman","Grock":"Tank","Guinevere":"Fighter","Gusion":"Assassin",
  "Hanabi":"Marksman","Hanzo":"Assassin","Harith":"Mage","Harley":"Mage","Hayabusa":"Assassin",
  "Helcurt":"Assassin","Hilda":"Fighter","Hylos":"Tank","Irithel":"Marksman","Ixia":"Marksman",
  "Jawhead":"Fighter","Johnson":"Tank","Joy":"Assassin","Julian":"Fighter","Kadita":"Mage",
  "Kagura":"Mage","Kaja":"Support","Kalea":"Mage","Karina":"Assassin","Karrie":"Marksman",
  "Khaleed":"Fighter","Khufra":"Tank","Kimmy":"Marksman","Lancelot":"Assassin","Lapu-Lapu":"Fighter",
  "Layla":"Marksman","Leomord":"Fighter","Lesley":"Marksman","Ling":"Assassin","Lolita":"Tank",
  "Lukas":"Fighter","Lunox":"Mage","Luo Yi":"Mage","Lylia":"Mage","Marcel":"Fighter",
  "Martis":"Fighter","Masha":"Fighter","Mathilda":"Support","Melissa":"Marksman","Minotaur":"Tank",
  "Minsitthar":"Fighter","Miya":"Marksman","Moskov":"Marksman","Nana":"Mage","Natalia":"Assassin",
  "Nolan":"Assassin","Obsidia":"Mage","Odette":"Mage","Paquito":"Fighter","Pharsa":"Mage","Phoveus":"Fighter",
  "Popol and Kupa":"Marksman","Rafaela":"Support","Roger":"Fighter","Ruby":"Fighter",
  "Saber":"Assassin","Selena":"Assassin","Sora":"Fighter","Suyou":"Fighter","Tamuz":"Fighter",
  "Terizla":"Fighter","Thamuz":"Fighter","Tigreal":"Tank","Uranus":"Tank","Valentina":"Mage",
  "Valir":"Mage","Vexana":"Mage","Wanwan":"Marksman","X.Borg":"Fighter","Xavier":"Mage",
  "Yi Sun-shin":"Assassin","Yin":"Fighter","Yu Zhong":"Fighter","Yve":"Mage","Zetian":"Mage",
  "Zhask":"Mage","Zhuxin":"Mage"
};

export function getRoleRank(role) {
  const order = { Tank: 1, Fighter: 2, Assassin: 3, Mage: 4, Marksman: 5, Support: 6, "?": 7 };
  return order[role] || 99;
}

export function getRoleColor(role) {
  const map = {
    Tank:      { bg: "#1e3a5f", text: "#6db3f8" },
    Fighter:   { bg: "#5f3a1e", text: "#f8a86d" },
    Assassin:  { bg: "#4a1e5f", text: "#c86df8" },
    Mage:      { bg: "#1e5f5f", text: "#6df8f8" },
    Marksman:  { bg: "#5f5f1e", text: "#f8f86d" },
    Support:   { bg: "#1e5f3a", text: "#6df8a8" }
  };
  return map[role] || { bg: "#333", text: "#fff" };
}
