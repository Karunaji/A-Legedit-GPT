const A={
  'attack_common':'assets/embedded/attack_common.png',
  'attack_rare':'assets/embedded/attack_rare.png',
  'attack_uncommon':'assets/embedded/attack_uncommon.png',
  'bg_covert_common':'assets/singlecolor/common red blank template.png',
  'bg_covert_uncommon':'assets/singlecolor/uncommon red blank template.png',
  'bg_grey_common':'assets/embedded/bg_grey_common.png',
  'bg_grey_uncommon':'assets/embedded/bg_grey_uncommon.png',
  'bg_instinct_common':'assets/singlecolor/common yellow template.png',
  'bg_instinct_uncommon':'assets/singlecolor/uncommon yellow template.png',
  'bg_range_common':'assets/singlecolor/common blue template.png',
  'bg_range_uncommon':'assets/singlecolor/uncommon blue template.png',
  'bg_strength_common':'assets/singlecolor/common green template.png',
  'bg_strength_uncommon':'assets/singlecolor/uncommon green template.png',
  'bg_tech_common':'assets/singlecolor/common black template.png',
  'bg_tech_uncommon':'assets/singlecolor/uncommon black template.png',
  'bg_henchman_matched':'assets/newtemplates/AHenchmanFrameMatched.png',
  'bg_henchman_ability_matched':'assets/newtemplates/AHenchmanAbilityBoxMatched.png',
  'overlay_henchman_vp_matched':'assets/newtemplates/AHenchmanVPMatched.png',
  'bg_location_matched':'assets/newtemplates/ALocationFrameMatched.png',
  'bg_scheme_layout_a':'assets/newtemplates/ASchemeSmall.png',
  'bg_scheme_layout_b':'assets/newtemplates/ASchemeTall.png',
  'bg_trap_matched':'assets/newtemplates/ATrapFrameMatched.png',
  'bg_trap_location_textbox_matched':'assets/newtemplates/ATrapLocationTextboxMatched.png',
  'bg_villain_matched':'assets/newtemplates/AVillainFrameMatched.png',
  'bg_adversary_matched':'assets/newtemplates/AdversaryMatched.png',
  'bg_mastermind_matched':'assets/newtemplates/MastermindMatched.png',
  'bg_hero_rare_template':'assets/newtemplates/HeroRareTemplate.png',
  'overlay_mastermind_vp_matched':'assets/newtemplates/VPMatched.png',
  'cost_common':'assets/embedded/cost_common.png',
  'cost_rare':'assets/embedded/cost_rare.png',
  'cost_uncommon':'assets/embedded/cost_uncommon.png',
  'cost_asterisk':'assets/newtemplates/Asterisk.png',
  'power_covert':'assets/embedded/power_covert.png',
  'power_instinct':'assets/embedded/power_instinct.png',
  'power_range':'assets/embedded/power_range.png',
  'power_strength':'assets/embedded/power_strength.png',
  'power_tech':'assets/embedded/power_tech.png',
  'power_covert_top':'assets/newtemplates/-e Covert.png',
  'power_covert_bottom':'assets/newtemplates/-e Covert bottom.png',
  'power_instinct_top':'assets/newtemplates/-e Instinct.png',
  'power_instinct_bottom':'assets/newtemplates/-e Instinct Bottom.png',
  'power_range_top':'assets/newtemplates/-e Range.png',
  'power_range_bottom':'assets/newtemplates/-e Range Bottom.png',
  'power_strength_top':'assets/newtemplates/-e Strength.png',
  'power_strength_bottom':'assets/newtemplates/-e Strength bottom.png',
  'power_tech_top':'assets/newtemplates/-e Tech.png',
  'power_tech_bottom':'assets/newtemplates/-e Tech bottom.png',
  'recruit_common':'assets/embedded/recruit_common.png',
  'recruit_rare':'assets/embedded/recruit_rare.png',
  'recruit_uncommon':'assets/embedded/recruit_uncommon.png',
  'team_autobot':'assets/embedded/team_autobot.png',
  'team_avengers':'assets/embedded/team_avengers.png',
  'team_decepticon':'assets/embedded/team_decepticon.png',
  'team_dinobot':'assets/embedded/team_dinobot.png',
  'team_fantastic-four':'assets/embedded/team_fantastic-four.png',
  'team_footclan':'assets/embedded/team_footclan.png',
  'team_guardians':'assets/embedded/team_guardians.png',
  'team_marvel-knights':'assets/embedded/team_marvel-knights.png',
  'team_mouser':'assets/embedded/team_mouser.png',
  'team_mutants':'assets/embedded/team_mutants.png',
  'team_predacon':'assets/embedded/team_predacon.png',
  'team_quintesson':'assets/embedded/team_quintesson.png',
  'team_shield':'assets/embedded/team_shield.png',
  'team_spider-friends':'assets/embedded/team_spider-friends.png',
  'team_squirrels':'assets/embedded/team_squirrels.png',
  'team_thunderbolts':'assets/embedded/team_thunderbolts.png',
  'team_turtles':'assets/embedded/team_turtles.png',
  'team_us-army':'assets/embedded/team_us-army.png',
  'team_x-force':'assets/embedded/team_x-force.png',
  'team_x-men':'assets/embedded/team_x-men.png',
  'title_bg':'assets/newtemplates/Dark Card Title BG.png'
};

const ASSET_VERSION = `${Date.now()}`;
const resolveAsset = (path) => {
  const url = new URL(path, window.location.href);
  url.searchParams.set('v', ASSET_VERSION);
  return url.href;
};

Object.keys(A).forEach((key) => {
  A[key] = resolveAsset(A[key]);
});

const HERO_CONFIG = window.LEGENDARY_HERO_CONFIG || {};
const CW = HERO_CONFIG.canvas?.width || 504;
const CH = HERO_CONFIG.canvas?.height || 700;
const EXPORT_SCALE = HERO_CONFIG.exportScale || 3;
const P = HERO_CONFIG.positions || {};
const TITLE_BAR = HERO_CONFIG.titleBar || {};
const TITLE_TEXT = HERO_CONFIG.titleText || {};
const TEXTBOX_ICONS = HERO_CONFIG.textboxIcons || {};
const RARE_BOX = HERO_CONFIG.rareBox || {};
const STAT_ICONS = HERO_CONFIG.statIcons || {};
const STAT_NUMBERS = HERO_CONFIG.statNumbers || {};
const INLINE_ICON_BOUNDS = new Map();

const BUILTIN_TEAMS = [
  {value:'autobot',label:'Autobots'},{value:'avengers',label:'Avengers'},
  {value:'decepticon',label:'Decepticons'},{value:'dinobot',label:'Dinobots'},
  {value:'fantastic-four',label:'Fantastic Four'},{value:'footclan',label:'Foot Clan'},
  {value:'guardians',label:'Guardians'},{value:'marvel-knights',label:'Marvel Knights'},
  {value:'mouser',label:'Mousers'},{value:'mutants',label:'Mutants'},
  {value:'predacon',label:'Predacons'},{value:'quintesson',label:'Quintessons'},
  {value:'shield',label:'S.H.I.E.L.D.'},{value:'spider-friends',label:'Spider-Friends'},
  {value:'squirrels',label:'Squirrel Army'},{value:'thunderbolts',label:'Thunderbolts'},
  {value:'turtles',label:'TMNT'},{value:'us-army',label:'US Army'},
  {value:'x-force',label:'X-Force'},{value:'x-men',label:'X-Men'},
];
let _customTeamCounter = 0;

Object.assign(A, {
  'bg_multi_strength_covert_common': resolveAsset('assets/multicolor/common multi green and red template.png'),
  'bg_multi_strength_instinct_common': resolveAsset('assets/multicolor/common multi green and yellow template.png'),
  'bg_multi_strength_range_common': resolveAsset('assets/multicolor/common multi green and blue template.png'),
  'bg_multi_strength_tech_common': resolveAsset('assets/multicolor/common multi green and black template.png'),
  'bg_multi_instinct_covert_common': resolveAsset('assets/multicolor/common multi yellow and red template.png'),
  'bg_multi_instinct_range_common': resolveAsset('assets/multicolor/common multi yellow and blue template.png'),
  'bg_multi_instinct_tech_common': resolveAsset('assets/multicolor/common multi yellow and black template.png'),
  'bg_multi_covert_range_common': resolveAsset('assets/multicolor/common multi red and blue template.png'),
  'bg_multi_covert_tech_common': resolveAsset('assets/multicolor/common multi red and black template.png'),
  'bg_multi_tech_range_common': resolveAsset('assets/multicolor/common multi black and blue template.png'),

  'bg_multi_strength_covert_uncommon': resolveAsset('assets/multicolor/uncommon multi green and red template.png'),
  'bg_multi_strength_instinct_uncommon': resolveAsset('assets/multicolor/uncommon multi green and yellow template.png'),
  'bg_multi_strength_range_uncommon': resolveAsset('assets/multicolor/uncommon multi green and blue template.png'),
  'bg_multi_strength_tech_uncommon': resolveAsset('assets/multicolor/uncommon multi green and black template.png'),
  'bg_multi_instinct_covert_uncommon': resolveAsset('assets/multicolor/uncommon multi yellow and red template.png'),
  'bg_multi_instinct_range_uncommon': resolveAsset('assets/multicolor/uncommon multi yellow and blue template.png'),
  'bg_multi_instinct_tech_uncommon': resolveAsset('assets/multicolor/uncommon multi yellow and black template.png'),
  'bg_multi_covert_range_uncommon': resolveAsset('assets/multicolor/uncommon multi red and blue template.png'),
  'bg_multi_covert_tech_uncommon': resolveAsset('assets/multicolor/uncommon multi red and black template.png'),
  'bg_multi_tech_range_uncommon': resolveAsset('assets/multicolor/uncommon multi black and blue template.png')
});

const MULTICOLOR_CLASS_ORDER = ['strength', 'instinct', 'covert', 'tech', 'range'];
const MULTICOLOR_ALLOWED_CLASSES = new Set(MULTICOLOR_CLASS_ORDER);

function normalizeMulticolorClasses(primary, secondary) {
  const pair = [primary, secondary]
    .filter(cls => MULTICOLOR_ALLOWED_CLASSES.has(cls))
    .sort((a, b) => MULTICOLOR_CLASS_ORDER.indexOf(a) - MULTICOLOR_CLASS_ORDER.indexOf(b));
  return pair.length === 2 && pair[0] !== pair[1] ? pair : null;
}

function getMulticolorTemplateKey(rarity, primary, secondary) {
  const pair = normalizeMulticolorClasses(primary, secondary);
  if (!pair) return null;
  const safeRarity = rarity === 'uncommon' ? 'uncommon' : 'common';
  return `bg_multi_${pair[0]}_${pair[1]}_${safeRarity}`;
}


