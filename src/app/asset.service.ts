import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators';
import * as cloneDeep from 'lodash.clonedeep';


export const NodeStatusHidden = 'hidden';
export const NodeStatusIncomplete = 'incomplete';
export const NodeStatusAttempted = 'attempted';
export const NodeStatusComplete = 'complete';
export const NodeStatusLocked = 'locked';

export type ScenarioNodeStatuses = typeof NodeStatusHidden | typeof NodeStatusIncomplete | typeof NodeStatusAttempted | typeof NodeStatusComplete | typeof NodeStatusLocked;

export interface ScenarioNodeTreasure {
  looted: "true" | "false";
  description: string;
}

export interface ScenarioNodeTreasureMap {
  [id: string]: ScenarioNodeTreasure;
}

export interface ScenarioNodeData {
  id: string;
  name: string;
  status: ScenarioNodeStatuses;
  side?: boolean;
  notes: string;
  pages: number[];
  activePage?: number;
  imageUrl?: string;
  treasure: ScenarioNodeTreasureMap;
}

export interface ScenarioNodePosition {
  x: number;
  y: number;
}

export interface ScenarioNode {
  data: ScenarioNodeData;
  position: ScenarioNodePosition;
}

export interface ScenarioEdgeData {
  source: string;
  target: string;
  type: 'requiredby' | 'blocks' | 'linksto' | 'unlocks';
}

export interface ScenarioEdge {
  data: ScenarioEdgeData;
}

export interface ScenarioData {
  nodes: ScenarioNode[];
  edges?: ScenarioEdge[];
}

export interface EncodedNodeV1 {
  data: {
    id: string;
    status: ScenarioNodeStatuses;
    notes: string;
    locked?: 'true'
  };
  position: {
    x: string;
    y: string;
  };
}

export interface EncodedNodeV1Data {
  nodes: EncodedNodeV1[];
  version: undefined;
}

export interface EncodedNodeV2 {
  id: string;
  notes?: string;
  status?: ScenarioNodeStatuses;
  x?: number;
  y?: number;
}

export interface EncodedNodeV2Data {
  nodes: EncodedNodeV2[];
  version: '2';
}


@Injectable()
export class AssetService {
  private defaultScenariosJSON: ScenarioData;

  constructor(private http: HttpClient) {}
  
  public getScenariosJSON(): Observable<ScenarioData> {
    let encodedTree = localStorage.getItem('gloomhavenScenarioTree');
    return this.http.get<any>('./assets/scenarios.json').pipe(
      map(scenarios => {
        this.defaultScenariosJSON = cloneDeep(scenarios);
        if (encodedTree) {
          scenarios.nodes = this.getDecodedScenarios(JSON.parse(encodedTree));
        }
        return scenarios;
      })
    );
  }

  public getDecodedScenarios(encodedNodes: EncodedNodeV2Data | EncodedNodeV1Data): ScenarioNode[] {
    const defaultNodes: ScenarioNode[] = cloneDeep(this.defaultScenariosJSON.nodes);
    let scenarioNodes: ScenarioNode[];
    if (encodedNodes.version === undefined) {
      const encodedNodeMap: {[key: string]: EncodedNodeV1} = (encodedNodes as EncodedNodeV1Data).nodes.reduce((map, node) => {
        map[node.data.id] = node;
        return map;
      }, {});

      scenarioNodes = defaultNodes.map((node) => {
        const encodedNode = encodedNodeMap[node.data.id];
        if (!encodedNode) return node;

        /* If an attribute was saved then copy it over to the current full JSON */
        if (typeof encodedNode.data.status !== 'undefined') {
          if (parseInt(encodedNode.data.id) > 51 && (encodedNode.data.status === NodeStatusHidden || encodedNode.data.locked == 'true')) {
            node.data.status = NodeStatusLocked;
          } else {
            node.data.status = encodedNode.data.status;
          }
        }
        if (typeof encodedNode.data.notes !== 'undefined') {
          node.data.notes = encodedNode.data.notes;
        }
        if (typeof encodedNode.position.x !== 'undefined') {
          node.position.x = parseInt(encodedNode.position.x);
        }
        if (typeof encodedNode.position.y !== 'undefined') {
          node.position.y = parseInt(encodedNode.position.x);
        }
        return node;
      });
    } else if (encodedNodes.version === '2') {
      const encodedNodeMap: {[key: string]: EncodedNodeV2;} = (encodedNodes as EncodedNodeV2Data).nodes.reduce((map, node) => {
        map[node.id] = node;
        return map;
      }, {});

      scenarioNodes = defaultNodes.map((node) => {
        const encodedNode = encodedNodeMap[node.data.id];
        if (!encodedNode) return node;

        /* If an attribute was saved then copy it over to the current full JSON */
        if (typeof encodedNode.status !== 'undefined') {
          node.data.status = encodedNode.status;
        }
        if (typeof encodedNode.notes !== 'undefined') {
          node.data.notes = encodedNode.notes;
        }
        if (typeof encodedNode.x !== 'undefined') {
          node.position.x = encodedNode.x;
        }
        if (typeof encodedNode.y !== 'undefined') {
          node.position.y = encodedNode.y;
        }
        return node;
      });
    } else {
      throw new Error('Unknown version ${encodedNodes.version}');
    }

    return scenarioNodes;
  }

  public getEncodedScenarios(scenarios: ScenarioData): EncodedNodeV2Data {
    const defaultNodeMap: {[id: string]: ScenarioNode;} = this.defaultScenariosJSON.nodes.reduce((map, node) => {
      map[node.data.id] = node;
      return map;
    }, {});

    /* Save only the attributes that are different from the default */
    const encodedNodes = scenarios.nodes.map(node => {
      const defaultNode = defaultNodeMap[node.data.id];
      const encodedNode: EncodedNodeV2 = {
        id: node.data.id,
      };
      if (defaultNode.data.status !== node.data.status) {
        encodedNode.status = node.data.status;
      }
      if (defaultNode.data.notes !== node.data.notes) {
        encodedNode.notes = node.data.notes;
      }
      if (defaultNode.position.x !== node.position.x || defaultNode.position.y !== node.position.y) {
        encodedNode.x = node.position.x;
        encodedNode.y = node.position.y;
      }
      return encodedNode;
    });
    return {
      nodes: encodedNodes,
      version: '2',
    };
  }

  public setScenariosJSON(scenarios: ScenarioData) {
    localStorage.setItem('gloomhavenScenarioTree', JSON.stringify(this.getEncodedScenarios(scenarios)));
  }

  public getImageUrl(activePage: number): string {
    return `assets/scenarios/${activePage}.jpg`;
  }
}
