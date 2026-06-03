export const BUFF_DEFS: Record<string, {
  id: string; name: string; description: string;
  type: string; iconColor: string; rarity: 'base';
}> = {
  '하늘의 파편': { id: '하늘의 파편', name: '하늘의 파편', description: '공격 시 20% 확률로 주변 적에게 체인 번개', type: 'buff', iconColor: 'linear-gradient(135deg, #4facfe, #00f2fe)', rarity: 'base' },
  '맥동하는 암석': { id: '맥동하는 암석', name: '맥동하는 암석', description: '3초마다 주변 적 50% 둔화 (1.5초)', type: 'buff', iconColor: 'linear-gradient(135deg, #434343, #666)', rarity: 'base' },
  '영원의 불꽃': { id: '영원의 불꽃', name: '영원의 불꽃', description: '적중 시 무한 중첩 화상 부여', type: 'buff', iconColor: 'linear-gradient(135deg, #ff0844, #ffb199)', rarity: 'base' },
  '태풍의 눈': { id: '태풍의 눈', name: '태풍의 눈', description: '이동 속도 40% 증가', type: 'buff', iconColor: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)', rarity: 'base' },
};

export function getPlayerSpeedMultiplier(weapons: string[], buffs: string[]): number {
  if (weapons.includes('황룡') || weapons.includes('백호') || buffs.includes('태풍의 눈')) {
    return weapons.includes('황룡') ? 1.8 : weapons.includes('백호') ? 1.6 : 1.4;
  }
  return 1.0;
}
