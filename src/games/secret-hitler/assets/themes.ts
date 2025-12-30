// Theme-aware asset loading system for Secret Hitler
// Each theme provides its own assets, with fallback to 'original' for missing assets

export type ThemeId = "original" | "voldemort";

// Layout configuration for board positioning
// All values are CSS calc-compatible strings (percentages)
export interface ThemeLayout {
  // Liberal board policy placement
  liberalPolicy: {
    offset: string;    // Left offset for first policy
    spacing: string;   // Horizontal spacing between policies
  };
  // Fascist board policy placement
  fascistPolicy: {
    offset: string;
    spacing: string;
  };
  // Election tracker positioning
  electionTracker: {
    top: string;
    leftOffset: string;   // Base left position
    spacing: string;      // Spacing per tracker position
    width: string;        // Tracker width
  };
}

// Theme-aware text labels for UI
export interface ThemeLabels {
  // Theme display name
  themeName: string;

  // Faction names
  liberalParty: string;        // "Liberals" / "Order of the Phoenix"
  fascistParty: string;        // "Fascists" / "Death Eaters"
  hitler: string;              // "Hitler" / "Voldemort"

  // Singular forms
  liberal: string;             // "Liberal" / "Phoenix member"
  fascist: string;             // "Fascist" / "Death Eater"

  // Policy names
  liberalPolicy: string;       // "liberal policy" / "Phoenix policy"
  fascistPolicy: string;       // "fascist policy" / "Death Eater policy"
  liberalPolicies: string;     // "liberal policies" / "Phoenix policies"
  fascistPolicies: string;     // "fascist policies" / "Death Eater policies"

  // Victory messages
  fascistPolicyVictory: string;
  fascistElectionVictory: string;
  liberalPolicyVictory: string;
  liberalExecutionVictory: string;

  // Game description (for home screen)
  gameDescription: {
    factionSplit: string;
    liberalGoal: string;
    fascistGoal: string;
  };

  // Role reveal messages
  youAre: {
    liberal: string;
    fascist: string;
    hitler: string;
  };

  // Party membership
  partyMembership: {
    liberal: string;
    fascist: string;
  };
}

// All game assets that can be themed
export interface ThemeAssets {
  // Boards
  boardLiberal: string;
  boardFascist56: string;
  boardFascist78: string;
  boardFascist910: string;
  boardElectionTracker: string;
  boardTracker: string;
  boardDraw: string;
  boardDiscard: string;

  // Policy cards
  policyLiberal: string;
  policyFascist: string;
  policyBack: string;
  policyFolderBack: string;
  policyFolderCoverFront: string;
  policyFolderCoverBack: string;

  // Board policy slots (placed policies)
  boardPolicyLiberal: string;
  boardPolicyFascist: string;

  // Party membership cards
  partyMembership: string;
  partyMembershipLiberal: string;
  partyMembershipFascist: string;

  // Voting
  voteYes: string;
  voteNo: string;

  // Role cards
  roleEnvelopeFront: string;
  roleEnvelopeBack: string;
  roleHitler: string;
  roleFascist1: string;
  roleFascist2: string;
  roleFascist3: string;
  roleLiberal1: string;
  roleLiberal2: string;
  roleLiberal3: string;
  roleLiberal4: string;
  roleLiberal5: string;
  roleLiberal6: string;

  // Player UI
  playerBase: string;
  playerBaseUnselectable: string;
  playerIconLiberal: string;
  playerIconFascist: string;
  playerIconHitler: string;
  playerIconBusy: string;
  playerIconJa: string;
  playerIconNein: string;

  // Victory screens
  victoryLiberalHeader: string;
  victoryLiberalFooter: string;
  victoryFascistHeader: string;
  victoryFascistFooter: string;

  // Misc
  badge: string;
}

// Original theme - all assets in /public/secret-hitler/
const originalAssets: ThemeAssets = {
  // Boards
  boardLiberal: "/secret-hitler/board-liberal.png",
  boardFascist56: "/secret-hitler/board-fascist-5-6.png",
  boardFascist78: "/secret-hitler/board-fascist-7-8.png",
  boardFascist910: "/secret-hitler/board-fascist-9-10.png",
  boardElectionTracker: "/secret-hitler/board-election-tracker.png",
  boardTracker: "/secret-hitler/board-tracker.png",
  boardDraw: "/secret-hitler/board-draw.png",
  boardDiscard: "/secret-hitler/board-discard.png",

  // Policy cards
  policyLiberal: "/secret-hitler/policy-liberal.png",
  policyFascist: "/secret-hitler/policy-fascist.png",
  policyBack: "/secret-hitler/board-policy.png",
  policyFolderBack: "/secret-hitler/policy-folder-back.png",
  policyFolderCoverFront: "/secret-hitler/policy-folder-cover-front.png",
  policyFolderCoverBack: "/secret-hitler/policy-folder-cover-back.png",

  // Board policy slots
  boardPolicyLiberal: "/secret-hitler/board-policy-liberal.png",
  boardPolicyFascist: "/secret-hitler/board-policy-fascist.png",

  // Party membership
  partyMembership: "/secret-hitler/party-membership.png",
  partyMembershipLiberal: "/secret-hitler/party-membership-liberal.png",
  partyMembershipFascist: "/secret-hitler/party-membership-fascist.png",

  // Voting
  voteYes: "/secret-hitler/vote-yes.png",
  voteNo: "/secret-hitler/vote-no.png",

  // Role cards
  roleEnvelopeFront: "/secret-hitler/role-envelope-front.png",
  roleEnvelopeBack: "/secret-hitler/role-envelope-back.png",
  roleHitler: "/secret-hitler/role-hitler.png",
  roleFascist1: "/secret-hitler/role-fascist-1.png",
  roleFascist2: "/secret-hitler/role-fascist-2.png",
  roleFascist3: "/secret-hitler/role-fascist-3.png",
  roleLiberal1: "/secret-hitler/role-liberal-1.png",
  roleLiberal2: "/secret-hitler/role-liberal-2.png",
  roleLiberal3: "/secret-hitler/role-liberal-3.png",
  roleLiberal4: "/secret-hitler/role-liberal-4.png",
  roleLiberal5: "/secret-hitler/role-liberal-5.png",
  roleLiberal6: "/secret-hitler/role-liberal-6.png",

  // Player UI
  playerBase: "/secret-hitler/player-base.png",
  playerBaseUnselectable: "/secret-hitler/player-base-unselectable.png",
  playerIconLiberal: "/secret-hitler/player-icon-liberal.png",
  playerIconFascist: "/secret-hitler/player-icon-fascist.png",
  playerIconHitler: "/secret-hitler/player-icon-hitler.png",
  playerIconBusy: "/secret-hitler/player-icon-busy.png",
  playerIconJa: "/secret-hitler/player-icon-ja.png",
  playerIconNein: "/secret-hitler/player-icon-nein.png",

  // Victory screens
  victoryLiberalHeader: "/secret-hitler/victory-liberal-header.png",
  victoryLiberalFooter: "/secret-hitler/victory-liberal-footer.png",
  victoryFascistHeader: "/secret-hitler/victory-fascist-header.png",
  victoryFascistFooter: "/secret-hitler/victory-fascist-footer.png",

  // Misc
  badge: "/secret-hitler/badge.svg",
};

// Voldemort theme - available assets in /public/secret-hitler/voldemort/
// Missing assets will fall back to original theme
const voldemortAssetsPartial: Partial<ThemeAssets> = {
  // Boards (Order of the Phoenix vs Death Eaters)
  boardLiberal: "/secret-hitler/voldemort/board-liberal.svg",
  boardFascist56: "/secret-hitler/voldemort/board-fascist-5-6.svg",
  boardFascist78: "/secret-hitler/voldemort/board-fascist-7-8.svg",
  boardFascist910: "/secret-hitler/voldemort/board-fascist-9-10.svg",

  // Policy cards
  policyLiberal: "/secret-hitler/voldemort/policy-liberal.svg",
  policyFascist: "/secret-hitler/voldemort/policy-fascist.svg",
  policyBack: "/secret-hitler/voldemort/board-policy.svg",

  // Board policy slots (reuse policy card images for now)
  boardPolicyLiberal: "/secret-hitler/voldemort/policy-liberal.svg",
  boardPolicyFascist: "/secret-hitler/voldemort/policy-fascist.svg",

  // Party membership
  partyMembership: "/secret-hitler/voldemort/party-membership.svg",
  partyMembershipFascist: "/secret-hitler/voldemort/party-membership-fascist.svg",

  // Voting
  voteYes: "/secret-hitler/voldemort/vote-yes.svg",
  voteNo: "/secret-hitler/voldemort/vote-no.svg",

  // Role cards - card back
  roleEnvelopeBack: "/secret-hitler/voldemort/backCard.svg",

  // Role cards - Voldemort (Hitler equivalent)
  roleHitler: "/secret-hitler/voldemort/role-voldemort.svg",

  // Role cards - Death Eaters (Fascists): Lucius, Bellatrix, Pettigrew
  roleFascist1: "/secret-hitler/voldemort/role-fascist-1.svg",
  roleFascist2: "/secret-hitler/voldemort/role-fascist-2.svg",
  roleFascist3: "/secret-hitler/voldemort/role-fascist-3.svg",

  // Role cards - Order of the Phoenix (Liberals): Harry, James, Ron, Hermione, Neville, Sirius
  roleLiberal1: "/secret-hitler/voldemort/role-liberal-1.svg",
  roleLiberal2: "/secret-hitler/voldemort/role-liberal-2.svg",
  roleLiberal3: "/secret-hitler/voldemort/role-liberal-3.svg",
  roleLiberal4: "/secret-hitler/voldemort/role-liberal-4.svg",
  roleLiberal5: "/secret-hitler/voldemort/role-liberal-5.svg",
  roleLiberal6: "/secret-hitler/voldemort/role-liberal-6.svg",
};

// Merge Voldemort partial with original fallbacks
const voldemortAssets: ThemeAssets = {
  ...originalAssets,
  ...voldemortAssetsPartial,
};

// Theme registry
const themes: Record<ThemeId, ThemeAssets> = {
  original: originalAssets,
  voldemort: voldemortAssets,
};

// Layout configurations per theme
// Original theme layout (matches the original PNG board dimensions)
const originalLayout: ThemeLayout = {
  liberalPolicy: {
    offset: "18.2%",
    spacing: "13.54%",
  },
  fascistPolicy: {
    offset: "11%",
    spacing: "13.6%",
  },
  electionTracker: {
    top: "74%",
    leftOffset: "34.2%",
    spacing: "9.16%",
    width: "3.2%",
  },
};

// Voldemort theme layout (adjusted for SVG board dimensions)
const voldemortLayout: ThemeLayout = {
  liberalPolicy: {
    offset: "15%",
    spacing: "15%",
  },
  fascistPolicy: {
    offset: "8%",
    spacing: "14.7%",
  },
  electionTracker: {
    top: "84%",
    leftOffset: "32.8%",
    spacing: "10.5%",
    width: "3.0%",
  },
};

// Layout registry
const layouts: Record<ThemeId, ThemeLayout> = {
  original: originalLayout,
  voldemort: voldemortLayout,
};

// Label configurations per theme
// Original theme labels
const originalLabels: ThemeLabels = {
  themeName: "Secret Hitler",

  liberalParty: "Liberals",
  fascistParty: "Fascists",
  hitler: "Hitler",

  liberal: "Liberal",
  fascist: "Fascist",

  liberalPolicy: "liberal policy",
  fascistPolicy: "fascist policy",
  liberalPolicies: "liberal policies",
  fascistPolicies: "fascist policies",

  fascistPolicyVictory: "Fascists successfully passed six policies!",
  fascistElectionVictory: "Fascists successfully elected Hitler as chancellor!",
  liberalPolicyVictory: "Liberals successfully passed five policies!",
  liberalExecutionVictory: "Liberals successfully executed Hitler!",

  gameDescription: {
    factionSplit: "Players are secretly divided into Liberals and Fascists",
    liberalGoal: "Liberals must enact liberal policies or find and execute Hitler",
    fascistGoal: "Fascists must enact fascist policies or elect Hitler as Chancellor",
  },

  youAre: {
    liberal: "You are a Liberal",
    fascist: "You are a Fascist",
    hitler: "You are Hitler",
  },

  partyMembership: {
    liberal: "Liberal Party",
    fascist: "Fascist Party",
  },
};

// Voldemort theme labels
const voldemortLabels: ThemeLabels = {
  themeName: "Secret Voldemort",

  liberalParty: "Order of the Phoenix",
  fascistParty: "Death Eaters",
  hitler: "Voldemort",

  liberal: "Phoenix Member",
  fascist: "Death Eater",

  liberalPolicy: "Phoenix policy",
  fascistPolicy: "Death Eater policy",
  liberalPolicies: "Phoenix policies",
  fascistPolicies: "Death Eater policies",

  fascistPolicyVictory: "Death Eaters successfully passed six policies!",
  fascistElectionVictory: "Death Eaters successfully elected Voldemort as Minister of Magic!",
  liberalPolicyVictory: "Order of the Phoenix successfully passed five policies!",
  liberalExecutionVictory: "Order of the Phoenix successfully defeated Voldemort!",

  gameDescription: {
    factionSplit: "Players are secretly divided into the Order of the Phoenix and Death Eaters",
    liberalGoal: "The Order must enact Phoenix policies or find and defeat Voldemort",
    fascistGoal: "Death Eaters must enact their policies or elect Voldemort as Minister of Magic",
  },

  youAre: {
    liberal: "You are a member of the Order of the Phoenix",
    fascist: "You are a Death Eater",
    hitler: "You are Voldemort",
  },

  partyMembership: {
    liberal: "Order of the Phoenix",
    fascist: "Death Eater",
  },
};

// Labels registry
const labels: Record<ThemeId, ThemeLabels> = {
  original: originalLabels,
  voldemort: voldemortLabels,
};

/**
 * Get all assets for a specific theme
 */
export function getThemeAssets(themeId: ThemeId): ThemeAssets {
  return themes[themeId] || themes.original;
}

/**
 * Get labels for a specific theme
 */
export function getThemeLabels(themeId: ThemeId): ThemeLabels {
  return labels[themeId] || labels.original;
}

/**
 * Get layout configuration for a specific theme
 */
export function getThemeLayout(themeId: ThemeId): ThemeLayout {
  return layouts[themeId] || layouts.original;
}

/**
 * Get a specific asset for a theme
 */
export function getAsset(themeId: ThemeId, assetKey: keyof ThemeAssets): string {
  const themeAssets = getThemeAssets(themeId);
  return themeAssets[assetKey];
}

/**
 * Check which assets are available for a theme (not falling back to original)
 */
export function getAvailableAssets(themeId: ThemeId): (keyof ThemeAssets)[] {
  if (themeId === "original") {
    return Object.keys(originalAssets) as (keyof ThemeAssets)[];
  }
  if (themeId === "voldemort") {
    return Object.keys(voldemortAssetsPartial) as (keyof ThemeAssets)[];
  }
  return [];
}

/**
 * Check which assets are missing for a theme (falling back to original)
 */
export function getMissingAssets(themeId: ThemeId): (keyof ThemeAssets)[] {
  const available = getAvailableAssets(themeId);
  const allKeys = Object.keys(originalAssets) as (keyof ThemeAssets)[];
  return allKeys.filter((key) => !available.includes(key));
}

export default themes;
