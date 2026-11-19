import { describe, it, expect } from 'vitest';
import {
  resolveAutoModel,
  shouldAutoTriggerDeepResearch,
  resolveAutoGroundingDocs,
  parseSmartIntent,
  resolveThinkingParams,
} from './chatAutoIntent';
import { SUPREMEAI_MODELS } from '../data/models';
import { KnowledgeDoc, PlatformConfig } from '../types';

const DEFAULT_FALLBACK = SUPREMEAI_MODELS[1]; // supreme-core

describe('chatAutoIntent', () => {
  describe('resolveAutoModel', () => {
    it('routes deep architectural or security audit prompts to supreme-reason', () => {
      const result = resolveAutoModel({
        promptText: 'Perform a security audit and find the root cause of the race condition.',
        models: SUPREMEAI_MODELS,
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(result.id).toBe('supreme-reason');
    });

    it('routes short code/component prompts to supreme-core and complex app builds to supreme-deep', () => {
      const quickSnippet = resolveAutoModel({
        promptText: 'Create a TypeScript helper function to format dates',
        models: SUPREMEAI_MODELS,
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(quickSnippet.id).toBe('supreme-core');

      const complexApp = resolveAutoModel({
        promptText: 'Build a full-stack e-commerce dashboard web app with analytics charts',
        models: SUPREMEAI_MODELS,
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(complexApp.id).toBe('supreme-deep');

      const phpProject = resolveAutoModel({
        promptText: 'create a php project',
        models: SUPREMEAI_MODELS,
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(phpProject.id).toBe('supreme-deep');

      const bnApp = resolveAutoModel({
        promptText: 'আমার জন্য একটি সুন্দর ড্যাশবোর্ড অ্যাপ তৈরি করো',
        models: SUPREMEAI_MODELS,
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(bnApp.id).toBe('supreme-deep');
    });

    it('routes image or document attachments to build/multimodal tier', () => {
      const result = resolveAutoModel({
        promptText: 'Analyze this diagram',
        attachment: {
          name: 'arch.png',
          mimeType: 'image/png',
          data: 'data:image/png;base64,abc',
        },
        models: SUPREMEAI_MODELS,
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(['supreme-core', 'supreme-deep']).toContain(result.id);
    });

    it('routes live news/web prompts to supremeai-web even if mentioning tech nouns', () => {
      const result = resolveAutoModel({
        promptText: 'What is the latest news about React 19 today?',
        models: SUPREMEAI_MODELS,
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(result.id).toBe('supremeai-web');

      const bnWeb = resolveAutoModel({
        promptText: 'আজকের আবহাওয়ার সর্বশেষ খবর কী?',
        models: SUPREMEAI_MODELS,
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(bnWeb.id).toBe('supremeai-web');
    });

    it('routes short everyday queries to supreme-spark and long prompts to supreme-core', () => {
      const shortPrompt = resolveAutoModel({
        promptText: 'Explain what a closure is in simple terms.',
        models: SUPREMEAI_MODELS,
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(shortPrompt.id).toBe('supreme-spark');

      const longPrompt = resolveAutoModel({
        promptText:
          'Summarize the following operational checklist and compare the tradeoffs carefully. '.repeat(
            5
          ),
        models: SUPREMEAI_MODELS,
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(longPrompt.id).toBe('supreme-core');
    });

    it('respects platform model policies for non-admin users', () => {
      const config: PlatformConfig = {
        maintenanceMode: false,
        maintenanceMessage: '',
        announcementBanner: { active: false, message: '', level: 'info' },
        allowNewSignups: true,
        defaultModelId: 'supreme-core',
        featureFlags: {},
        modelPolicies: {
          'supreme-reason': { enabled: true, minTier: 'Enterprise' },
          'supreme-deep': { enabled: false, minTier: 'Free' },
        },
      };

      const freeUser = resolveAutoModel({
        promptText: 'Run a distributed security audit and architecture review.',
        models: SUPREMEAI_MODELS,
        platformConfig: config,
        userTier: 'Free',
        currentRole: 'user',
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(freeUser.id).toBe('supreme-core');

      const adminUser = resolveAutoModel({
        promptText: 'Run a distributed security audit and architecture review.',
        models: SUPREMEAI_MODELS,
        platformConfig: config,
        userTier: 'Free',
        currentRole: 'admin',
        fallbackModel: DEFAULT_FALLBACK,
      });
      expect(adminUser.id).toBe('supreme-reason');
    });
  });

  describe('shouldAutoTriggerDeepResearch', () => {
    it('detects English and Bengali deep research requests', () => {
      expect(
        shouldAutoTriggerDeepResearch(
          'Run deep research on serverless edge databases with citations'
        )
      ).toBe(true);
      expect(shouldAutoTriggerDeepResearch('বাংলায় একটি গভীর রিসার্চ রিপোর্ট তৈরি করো')).toBe(true);
    });

    it('returns false for regular questions, empty input, or attachments', () => {
      expect(shouldAutoTriggerDeepResearch('Build a calculator app')).toBe(false);
      expect(shouldAutoTriggerDeepResearch('   ')).toBe(false);
      expect(
        shouldAutoTriggerDeepResearch('Run deep research report', {
          name: 'doc.pdf',
          mimeType: 'application/pdf',
          data: 'data:application/pdf;base64,123',
        })
      ).toBe(false);
    });
  });

  describe('resolveAutoGroundingDocs', () => {
    const sampleDocs: KnowledgeDoc[] = [
      {
        id: 'doc-1',
        title: 'API Authentication Spec',
        type: 'markdown',
        sizeBytes: 2048,
        tokenCount: 512,
        chunkCount: 8,
        status: 'indexed',
        lastIndexed: '2026-01-01',
        isGroundingActive: false,
        contentPreview: 'OAuth & Bearer token spec',
      },
      {
        id: 'doc-2',
        title: 'Pricing Playbook',
        type: 'pdf',
        sizeBytes: 1024,
        tokenCount: 256,
        chunkCount: 5,
        status: 'indexed',
        lastIndexed: '2026-01-02',
        isGroundingActive: false,
        contentPreview: 'Enterprise discounts & tiers',
      },
    ];

    it('prioritizes explicitly active grounding docs', () => {
      const docs = [{ ...sampleDocs[0], isGroundingActive: true }, sampleDocs[1]];
      const selected = resolveAutoGroundingDocs('hello', docs, false);
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('doc-1');
    });

    it('matches knowledge documents mentioned by title in the prompt', () => {
      const selected = resolveAutoGroundingDocs(
        'Check our Pricing Playbook for enterprise discounts',
        sampleDocs,
        true
      );
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('doc-2');
    });

    it('attaches docs on explicit RAG / uploaded document references when enabled', () => {
      const selected = resolveAutoGroundingDocs(
        'Answer this from my uploaded doc and knowledge base',
        sampleDocs,
        true
      );
      expect(selected).toHaveLength(2);
    });

    it('returns empty array when nothing matches and no docs are active', () => {
      const selected = resolveAutoGroundingDocs('Write a poem about clouds', sampleDocs, true);
      expect(selected).toHaveLength(0);
    });
  });

  describe('parseSmartIntent', () => {
    const docs: KnowledgeDoc[] = [
      {
        id: 'doc-rag-1',
        title: 'SupremeAI Security Architecture',
        type: 'markdown',
        sizeBytes: 4096,
        tokenCount: 800,
        chunkCount: 12,
        status: 'indexed',
        lastIndexed: '2026-05-01',
        isGroundingActive: false,
        contentPreview: 'Zero-trust gateway HMAC signing and RBAC rules',
      },
    ];

    it('auto-enables RAG on topic/title match without any manual toggle', () => {
      const res = parseSmartIntent({
        promptText: 'Summarize SupremeAI Security Architecture from docs',
        knowledgeDocs: docs,
        enableKnowledgeGroundingPref: true,
      });
      expect(res.enableRag).toBe(true);
      expect(res.matchedDocs).toHaveLength(1);
      expect(res.matchedDocs[0].id).toBe('doc-rag-1');
    });

    it('auto-enables PHP project builder and live artifact sync for "create a php project"', () => {
      const res = parseSmartIntent({
        promptText: 'create a php project',
        knowledgeDocs: docs,
      });
      expect(res.enableProjectBuilder).toBe(true);
      expect(res.enableLiveArtifactSync).toBe(true);
      expect(res.projectRuntimeHint).toBe('php');
      expect(res.enableDeepResearch).toBe(false);
      expect(res.recommendedModelId).toBe('supreme-deep');
    });

    it('detects Python, Node, and React project runtimes automatically', () => {
      expect(
        parseSmartIntent({ promptText: 'Build a python Flask script' }).projectRuntimeHint
      ).toBe('python');
      expect(
        parseSmartIntent({ promptText: 'Build a node.js express API' }).projectRuntimeHint
      ).toBe('node');
      expect(
        parseSmartIntent({ promptText: 'Create a React task manager app' }).projectRuntimeHint
      ).toBe('react');
    });

    it('auto-enables Deep Research only for genuine research queries', () => {
      const res = parseSmartIntent({
        promptText: 'Do deep research on WebAssembly vs containers in 2026',
      });
      expect(res.enableDeepResearch).toBe(true);
      expect(res.enableProjectBuilder).toBe(false);
    });

    it('auto-assigns recommendedThinkingLevel across Q&A, live web, vision/coding, and security/architecture audits', () => {
      expect(parseSmartIntent({ promptText: 'What is HTTP 200?' }).recommendedThinkingLevel).toBe(
        'LOW'
      );
      expect(
        parseSmartIntent({ promptText: 'What is the latest Bitcoin price today?' })
          .recommendedThinkingLevel
      ).toBe('MEDIUM');
      expect(
        parseSmartIntent({
          promptText: 'Inspect this screenshot',
          attachment: {
            name: 'ui.png',
            mimeType: 'image/png',
            data: 'data:image/png;base64,abc',
          },
        }).recommendedThinkingLevel
      ).toBe('HIGH');
      expect(
        parseSmartIntent({ promptText: 'Perform a security audit and find the root cause.' })
          .recommendedThinkingLevel
      ).toBe('XHIGH');
    });

    it('auto-enables search grounding for live-web queries unless JSON output or Deep Research is active', () => {
      expect(
        parseSmartIntent({ promptText: 'What is the latest news and weather in Dhaka today?' })
          .enableSearchGrounding
      ).toBe(true);
      expect(
        parseSmartIntent({ promptText: 'আজকের আবহাওয়ার সর্বশেষ খবর কী?' }).enableSearchGrounding
      ).toBe(true);
      expect(
        parseSmartIntent({ promptText: 'Explain closures in JavaScript' }).enableSearchGrounding
      ).toBe(false);
      const jsonReq = parseSmartIntent({
        promptText: 'Return only valid JSON with today latest price',
      });
      expect(jsonReq.enableJsonOutput).toBe(true);
      expect(jsonReq.enableSearchGrounding).toBe(false);
    });

    it('auto-triggers HIGH thinking for analytical, tradeoff, and Bengali step-by-step queries', () => {
      expect(
        parseSmartIntent({ promptText: 'Compare PostgreSQL and Redis tradeoffs carefully' })
          .recommendedThinkingLevel
      ).toBe('HIGH');
      expect(
        parseSmartIntent({ promptText: 'এই দুইটি পদ্ধতির ধাপে ধাপে বিশ্লেষণ ও তুলনা দাও' })
          .recommendedThinkingLevel
      ).toBe('HIGH');
    });
  });

  describe('resolveThinkingParams', () => {
    it('maps LOW/MEDIUM/HIGH/XHIGH to gateway reasoning_effort and low-latency budgets', () => {
      expect(resolveThinkingParams('LOW')).toEqual({
        thinkingLevel: 'LOW',
        reasoningEffort: 'low',
        defaultThinkingBudget: 0,
        highThinkingEnabled: false,
      });
      expect(resolveThinkingParams('MEDIUM')).toEqual({
        thinkingLevel: 'MEDIUM',
        reasoningEffort: 'medium',
        defaultThinkingBudget: 2048,
        highThinkingEnabled: false,
      });
      expect(resolveThinkingParams('HIGH')).toEqual({
        thinkingLevel: 'HIGH',
        reasoningEffort: 'high',
        defaultThinkingBudget: 8192,
        highThinkingEnabled: true,
      });
      expect(resolveThinkingParams('XHIGH')).toEqual({
        thinkingLevel: 'XHIGH',
        reasoningEffort: 'high',
        defaultThinkingBudget: 16384,
        highThinkingEnabled: true,
      });
    });
  });
});
