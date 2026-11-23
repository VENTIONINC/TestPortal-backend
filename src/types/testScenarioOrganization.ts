// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

interface SuiteMembershipSnapshot {
  projectId: string;
  suiteId: string;
  expectedMembershipRevision: number;
  expectedScenarioIds: string[];
  updatedById?: string;
}

interface SuiteMoveSnapshot {
  projectId: string;
  expectedSourceMembershipRevision: number;
  expectedDestinationMembershipRevision: number;
  expectedSourceScenarioIds: string[];
  expectedDestinationScenarioIds: string[];
  updatedById?: string;
}

export interface SuiteMembershipUndo {
  suiteId: string;
  addedScenarioIds: string[];
  removedMembers: Array<{ scenarioId: string; position: number }>;
}

export interface SuiteMoveUndo {
  sourceSuiteId: string;
  destinationSuiteId: string;
  sourceMembers: Array<{ scenarioId: string; position: number }>;
  destinationAddedScenarioIds: string[];
}

export interface MutateSuiteMembershipInput extends SuiteMembershipSnapshot {
  addScenarioIds?: string[];
  removeScenarioIds?: string[];
}

export interface ChangeSuiteMembershipInput extends MutateSuiteMembershipInput {
  addScenarioIds: string[];
  removeScenarioIds: string[];
}

export interface RestoreSuiteMembershipInput extends SuiteMembershipSnapshot {
  restoreData: SuiteMembershipUndo;
}

export interface MoveSuiteMembershipInput extends SuiteMoveSnapshot {
  sourceSuiteId: string;
  destinationSuiteId: string;
  scenarioIds: string[];
}

export interface RestoreSuiteMoveInput extends SuiteMoveSnapshot {
  restoreData: SuiteMoveUndo;
}

export interface MutateSuiteMembersInput {
  projectId: string;
  suiteId: string;
  scenarioIds: string[];
  operation: "add" | "remove";
  updatedById?: string;
}

export interface ReorderSuiteMembersInput {
  projectId: string;
  suiteId: string;
  expectedMembershipRevision?: number;
  expectedScenarioIds?: string[];
  scenarioIds: string[];
}
