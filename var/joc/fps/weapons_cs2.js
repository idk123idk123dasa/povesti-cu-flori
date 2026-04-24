// CS2 Weapon Database with Accurate Statistics
export const CS2_WEAPONS = {
    // PISTOLS - TERRORISTS
    'glock-18': {
        name: 'Glock-18',
        category: 'pistols',
        team: 'T',
        price: 200,
        damage: 29.5, // Base damage to achieve 118 HS no armor (29.5 * 4 = 118)
        headshotMultiplier: 4.0,
        armorPenetration: 46.6, // 55/118 = 46.6% penetration
        fireRate: 400,
        magSize: 20,
        reserve: 120,
        accuracy: 0.85,
        range: 25,
        recoilPattern: 'low'
    },
    'p250': {
        name: 'P250',
        category: 'pistols',
        team: 'both',
        price: 300,
        damage: 37.75, // 37.75 * 4 = 151 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 63.6, // 96/151 = 63.6%
        fireRate: 400,
        magSize: 13,
        reserve: 26,
        accuracy: 0.88,
        range: 30,
        recoilPattern: 'medium'
    },
    'tec-9': {
        name: 'Tec-9',
        category: 'pistols',
        team: 'T',
        price: 500,
        damage: 33, // 33 * 4 = 132 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 90.2, // 119/132 = 90.2%
        fireRate: 500,
        magSize: 18,
        reserve: 90,
        accuracy: 0.80,
        range: 25,
        recoilPattern: 'medium'
    },
    'desert-eagle': {
        name: 'Desert Eagle',
        category: 'pistols',
        team: 'both',
        price: 700,
        damage: 62.5, // 62.5 * 4 = 250 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 92.4, // 231/250 = 92.4%
        fireRate: 267,
        magSize: 7,
        reserve: 35,
        accuracy: 0.90,
        range: 50,
        recoilPattern: 'very-high'
    },
    'dual-berettas': {
        name: 'Dual Berettas',
        category: 'pistols',
        team: 'both',
        price: 400,
        damage: 38, // 38 * 4 = 152 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 52.0, // 79/152 = 52%
        fireRate: 500,
        magSize: 30,
        reserve: 120,
        accuracy: 0.75,
        range: 25,
        recoilPattern: 'medium'
    },

    // PISTOLS - COUNTER-TERRORISTS
    'usp-s': {
        name: 'USP-S',
        category: 'pistols',
        team: 'CT',
        price: 200,
        damage: 35, // 35 * 4 = 140 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 50.0, // 70/140 = 50%
        fireRate: 352,
        magSize: 12,
        reserve: 24,
        accuracy: 0.92,
        range: 30,
        recoilPattern: 'low'
    },
    'p2000': {
        name: 'P2000',
        category: 'pistols',
        team: 'CT',
        price: 200,
        damage: 35, // Same as USP-S: 140 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 50.0, // 70/140 = 50%
        fireRate: 352,
        magSize: 13,
        reserve: 52,
        accuracy: 0.90,
        range: 30,
        recoilPattern: 'low'
    },
    'five-seven': {
        name: 'Five-SeveN',
        category: 'pistols',
        team: 'CT',
        price: 500,
        damage: 31.5, // 31.5 * 4 = 126 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 91.3, // 115/126 = 91.3%
        fireRate: 400,
        magSize: 20,
        reserve: 100,
        accuracy: 0.87,
        range: 30,
        recoilPattern: 'low'
    },

    // SMGs - TERRORISTS
    'mac-10': {
        name: 'MAC-10',
        category: 'smgs',
        team: 'T',
        price: 1050,
        damage: 28.5, // 28.5 * 4 = 114 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 57.0, // 65/114 = 57%
        fireRate: 800,
        magSize: 30,
        reserve: 100,
        accuracy: 0.75,
        range: 20,
        recoilPattern: 'medium'
    },
    'mp5-sd': {
        name: 'MP5-SD',
        category: 'smgs',
        team: 'both',
        price: 1500,
        damage: 26.75, // 26.75 * 4 = 107 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 61.7, // 66/107 = 61.7%
        fireRate: 750,
        magSize: 30,
        reserve: 120,
        accuracy: 0.82,
        range: 25,
        recoilPattern: 'low'
    },
    'mp7': {
        name: 'MP7',
        category: 'smgs',
        team: 'both',
        price: 1500,
        damage: 27.5, // 27.5 * 4 = 110 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 64.5, // 71/110 = 64.5%
        fireRate: 750,
        magSize: 30,
        reserve: 120,
        accuracy: 0.80,
        range: 25,
        recoilPattern: 'medium'
    },
    'p90': {
        name: 'P90',
        category: 'smgs',
        team: 'both',
        price: 2350,
        damage: 25.75, // 25.75 * 4 = 103 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 68.9, // 71/103 = 68.9%
        fireRate: 857,
        magSize: 50,
        reserve: 100,
        accuracy: 0.78,
        range: 25,
        recoilPattern: 'low'
    },
    'pp-bizon': {
        name: 'PP-Bizon',
        category: 'smgs',
        team: 'both',
        price: 1400,
        damage: 27, // 27 * 4 = 108 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 56.5, // 61/108 = 56.5%
        fireRate: 750,
        magSize: 64,
        reserve: 120,
        accuracy: 0.77,
        range: 20,
        recoilPattern: 'low'
    },

    // SMGs - COUNTER-TERRORISTS
    'mp9': {
        name: 'MP9',
        category: 'smgs',
        team: 'CT',
        price: 1250,
        damage: 26, // 26 * 4 = 104 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 58.7, // 61/104 = 58.7%
        fireRate: 857,
        magSize: 30,
        reserve: 120,
        accuracy: 0.76,
        range: 20,
        recoilPattern: 'high'
    },

    // RIFLES - TERRORISTS
    'ak-47': {
        name: 'AK-47',
        category: 'rifles',
        team: 'T',
        price: 2700,
        damage: 35.75, // 35.75 * 4 = 143 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 77.6, // 111/143 = 77.6%
        fireRate: 600,
        magSize: 30,
        reserve: 90,
        accuracy: 0.85,
        range: 50,
        recoilPattern: 'high'
    },
    'galil-ar': {
        name: 'Galil AR',
        category: 'rifles',
        team: 'T',
        price: 1800,
        damage: 30, // 30 * 4 = 120 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 75.0, // 90/120 = 75%
        fireRate: 666,
        magSize: 35,
        reserve: 90,
        accuracy: 0.82,
        range: 45,
        recoilPattern: 'medium'
    },
    'sg-553': {
        name: 'SG 553',
        category: 'rifles',
        team: 'T',
        price: 3000,
        damage: 36, // 36 * 4 = 144 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 75.0, // 108/144 = 75%
        fireRate: 545,
        magSize: 30,
        reserve: 90,
        accuracy: 0.89,
        range: 50,
        recoilPattern: 'low'
    },
    'ssg-08': {
        name: 'SSG 08',
        category: 'rifles',
        team: 'both',
        price: 1700,
        damage: 78.75, // 78.75 * 4 = 315 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 80.3, // 253/315 = 80.3%
        fireRate: 48,
        magSize: 10,
        reserve: 90,
        accuracy: 0.98,
        range: 100,
        recoilPattern: 'high'
    },
    'awp': {
        name: 'AWP',
        category: 'rifles',
        team: 'both',
        price: 4750,
        damage: 114.75, // 114.75 * 4 = 459 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 85.2, // 391/459 = 85.2%
        fireRate: 41,
        magSize: 5,
        reserve: 30,
        accuracy: 0.99,
        range: 100,
        recoilPattern: 'extreme'
    },
    'g3sg1': {
        name: 'G3SG1',
        category: 'rifles',
        team: 'T',
        price: 5000,
        damage: 73, // 73 * 4 = 292 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 79.8, // 233/292 = 79.8%
        fireRate: 240,
        magSize: 20,
        reserve: 90,
        accuracy: 0.95,
        range: 100,
        recoilPattern: 'medium'
    },

    // RIFLES - COUNTER-TERRORISTS
    'm4a4': {
        name: 'M4A4',
        category: 'rifles',
        team: 'CT',
        price: 3100,
        damage: 32.75, // 32.75 * 4 = 131 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 70.2, // 92/131 = 70.2%
        fireRate: 666,
        magSize: 30,
        reserve: 90,
        accuracy: 0.88,
        range: 50,
        recoilPattern: 'medium'
    },
    'm4a1-s': {
        name: 'M4A1-S',
        category: 'rifles',
        team: 'CT',
        price: 2900,
        damage: 32.75, // Same as M4A4: 131 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 70.2, // 92/131 = 70.2%
        fireRate: 600,
        magSize: 25,
        reserve: 75,
        accuracy: 0.92,
        range: 50,
        recoilPattern: 'low'
    },
    'famas': {
        name: 'FAMAS',
        category: 'rifles',
        team: 'CT',
        price: 2050,
        damage: 30, // 30 * 4 = 120 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 75.0, // 90/120 = 75%
        fireRate: 666,
        magSize: 25,
        reserve: 90,
        accuracy: 0.84,
        range: 45,
        recoilPattern: 'medium'
    },
    'aug': {
        name: 'AUG',
        category: 'rifles',
        team: 'CT',
        price: 3300,
        damage: 32, // 32 * 4 = 128 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 75.0, // 96/128 = 75%
        fireRate: 600,
        magSize: 30,
        reserve: 90,
        accuracy: 0.90,
        range: 50,
        recoilPattern: 'low'
    },
    'scar-20': {
        name: 'SCAR-20',
        category: 'rifles',
        team: 'CT',
        price: 5000,
        damage: 80, // 80 * 4 = 320 HS no armor
        headshotMultiplier: 4.0,
        armorPenetration: 72.8, // 233/320 = 72.8%
        fireRate: 240,
        magSize: 20,
        reserve: 90,
        accuracy: 0.95,
        range: 100,
        recoilPattern: 'medium'
    },

    // HEAVY - BOTH TEAMS
    'nova': {
        name: 'Nova',
        category: 'heavy',
        team: 'both',
        price: 1050,
        damage: 26.5, // 26.5 * 4 = 106 HS no armor (per pellet)
        headshotMultiplier: 4.0,
        armorPenetration: 49.1, // 52/106 = 49.1%
        fireRate: 68,
        magSize: 8,
        reserve: 32,
        accuracy: 0.70,
        range: 10,
        recoilPattern: 'high'
    },
    'xm1014': {
        name: 'XM1014',
        category: 'heavy',
        team: 'both',
        price: 2000,
        damage: 20, // 20 * 4 = 80 HS no armor (per pellet)
        headshotMultiplier: 4.0,
        armorPenetration: 80.0, // 64/80 = 80%
        fireRate: 171,
        magSize: 7,
        reserve: 32,
        accuracy: 0.65,
        range: 10,
        recoilPattern: 'medium'
    },
    'negev': {
        name: 'Negev',
        category: 'heavy',
        team: 'both',
        price: 1700,
        damage: 35,
        headshotMultiplier: 4.0,
        armorPenetration: 75.0,
        fireRate: 800,
        magSize: 150,
        reserve: 200,
        accuracy: 0.70,
        range: 50,
        recoilPattern: 'very-high'
    },
    'm249': {
        name: 'M249',
        category: 'heavy',
        team: 'both',
        price: 5200,
        damage: 32,
        headshotMultiplier: 4.0,
        armorPenetration: 80.0,
        fireRate: 750,
        magSize: 100,
        reserve: 200,
        accuracy: 0.75,
        range: 50,
        recoilPattern: 'very-high'
    },

    // HEAVY - TERRORISTS
    'sawed-off': {
        name: 'Sawed-Off',
        category: 'heavy',
        team: 'T',
        price: 1100,
        damage: 32, // 32 * 4 = 128 HS no armor (per pellet)
        headshotMultiplier: 4.0,
        armorPenetration: 75.0, // 96/128 = 75%
        fireRate: 71,
        magSize: 7,
        reserve: 32,
        accuracy: 0.60,
        range: 8,
        recoilPattern: 'very-high'
    },

    // HEAVY - COUNTER-TERRORISTS
    'mag-7': {
        name: 'MAG-7',
        category: 'heavy',
        team: 'CT',
        price: 1300,
        damage: 30, // 30 * 4 = 120 HS no armor (per pellet)
        headshotMultiplier: 4.0,
        armorPenetration: 75.0, // 90/120 = 75%
        fireRate: 71,
        magSize: 5,
        reserve: 32,
        accuracy: 0.65,
        range: 10,
        recoilPattern: 'high'
    },

    // GRENADES - BOTH TEAMS
    'he-grenade': {
        name: 'HE Grenade',
        category: 'grenades',
        team: 'both',
        price: 300,
        damage: 98, // max damage
        type: 'explosive'
    },
    'flashbang': {
        name: 'Flashbang',
        category: 'grenades',
        team: 'both',
        price: 200,
        type: 'tactical'
    },
    'smoke-grenade': {
        name: 'Smoke Grenade',
        category: 'grenades',
        team: 'both',
        price: 300,
        type: 'tactical'
    },
    'decoy-grenade': {
        name: 'Decoy Grenade',
        category: 'grenades',
        team: 'both',
        price: 50,
        type: 'tactical'
    },

    // GRENADES - TERRORISTS
    'molotov': {
        name: 'Molotov',
        category: 'grenades',
        team: 'T',
        price: 400,
        damage: 40, // per second
        type: 'incendiary'
    },

    // GRENADES - COUNTER-TERRORISTS
    'incendiary-grenade': {
        name: 'Incendiary Grenade',
        category: 'grenades',
        team: 'CT',
        price: 600,
        damage: 40, // per second
        type: 'incendiary'
    },

    // EQUIPMENT - BOTH TEAMS
    'kevlar-vest': {
        name: 'Kevlar Vest',
        category: 'equipment',
        team: 'both',
        price: 650,
        armor: 100,
        type: 'armor'
    },
    'kevlar-helmet': {
        name: 'Kevlar + Helmet',
        category: 'equipment',
        team: 'both',
        price: 1000,
        armor: 100,
        helmet: true,
        type: 'armor'
    },

    // EQUIPMENT - COUNTER-TERRORISTS
    'defuse-kit': {
        name: 'Defuse Kit',
        category: 'equipment',
        team: 'CT',
        price: 400,
        type: 'utility'
    }
};
