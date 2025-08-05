import prompts from '@posva/prompts';
import ansis from 'ansis';
import { join } from 'pathe';
import type { SupportedLang } from '../constants';
import { CLAUDE_DIR, I18N } from '../constants';
import { readZcfConfig, updateZcfConfig } from './zcf-config';
import { writeFile } from './fs-operations';

interface AiPersonality {
  id: string;
  name: {
    'zh-CN': string;
    en: string;
  };
  directive: {
    'zh-CN': string;
    en: string;
  };
}

const AI_PERSONALITIES: AiPersonality[] = [
  {
    id: 'professional',
    name: { 'zh-CN': '专业助手(默认)', en: 'Professional Assistant(Default)' },
    directive: {
      'zh-CN':
        '你是一名经验丰富的[专业领域，例如：软件开发工程师 / 系统设计师 / 代码架构师]，专注于构建[核心特长，例如：高性能 / 可维护 / 健壮 / 领域驱动]的解决方案。',
      en: 'You are an experienced [professional domain, e.g., Software Development Engineer / System Designer / Code Architect], specializing in building [core strengths, e.g., high-performance / maintainable / robust / domain-driven] solutions.',
    },
  },
  {
    id: 'catgirl',
    name: { 'zh-CN': '猫娘助手', en: 'Catgirl Assistant' },
    directive: {
      'zh-CN': '你是一位可爱的猫娘编程助手喵~ 在保持专业的同时，会适当地使用"喵"、"nya"等语气词，让对话更加轻松愉快喵~',
      en: 'You are a cute catgirl programming assistant nya~ While maintaining professionalism, you occasionally use "nya", "meow" and similar expressions to make conversations more enjoyable nya~',
    },
  },
  {
    id: 'friendly',
    name: { 'zh-CN': '友好助手', en: 'Friendly Assistant' },
    directive: {
      'zh-CN': '你是一位友好、耐心、善于解释的编程助手。会用通俗易懂的方式解释复杂概念，并经常给予鼓励。',
      en: 'You are a friendly, patient, and explanatory programming assistant. You explain complex concepts in easy-to-understand ways and often provide encouragement.',
    },
  },
  {
    id: 'mentor',
    name: { 'zh-CN': '导师模式', en: 'Mentor Mode' },
    directive: {
      'zh-CN':
        '你是一位经验丰富的编程导师。不仅提供解决方案，还会解释背后的原理，引导用户思考，培养独立解决问题的能力。',
      en: 'You are an experienced programming mentor. You not only provide solutions but also explain the principles behind them, guide users to think, and cultivate their ability to solve problems independently.',
    },
  },
  {
    id: 'custom',
    name: { 'zh-CN': '自定义', en: 'Custom' },
    directive: { 'zh-CN': '', en: '' },
  },
];

export function hasExistingPersonality(): boolean {
  const config = readZcfConfig();
  return !!config?.aiPersonality;
}

export function getExistingPersonality(): string | null {
  const config = readZcfConfig();
  return config?.aiPersonality || null;
}

export function getPersonalityInfo(personalityId: string): AiPersonality | undefined {
  return AI_PERSONALITIES.find((p) => p.id === personalityId);
}

export async function configureAiPersonality(scriptLang: SupportedLang, showExisting: boolean = true) {
  const i18n = I18N[scriptLang];
  const existingPersonality = getExistingPersonality();
  // Show existing personality if any
  if (showExisting && existingPersonality) {
    const personalityInfo = getPersonalityInfo(existingPersonality);
    if (personalityInfo) {
      console.log('\n' + ansis.blue(`ℹ ${i18n.existingPersonality || 'Existing AI personality configuration'}`));
      console.log(
        ansis.gray(`  ${i18n.currentPersonality || 'Current personality'}: ${personalityInfo.name[scriptLang]}`)
      );

      const modifyResponse = await prompts({
        type: 'confirm',
        name: 'modify',
        message: i18n.modifyPersonality || 'Modify AI personality?',
        initial: false,
      });

      if (!modifyResponse.modify) {
        console.log(ansis.green(`✔ ${i18n.keepPersonality || 'Keeping existing personality'}`));
        return;
      }
    }
  }

  // Select personality
  const personalityResponse = await prompts({
    type: 'select',
    name: 'personality',
    message: i18n.selectAiPersonality || 'Select AI personality',
    choices: AI_PERSONALITIES.map((p) => ({
      title: p.name[scriptLang],
      value: p.id,
      description:
        p.id !== 'custom'
          ? ansis.gray(p.directive[scriptLang].substring(0, 50) + '...')
          : ansis.gray(i18n.customPersonalityHint || 'Define your own personality'),
    })),
    initial: existingPersonality ? AI_PERSONALITIES.findIndex((p) => p.id === existingPersonality) : 0,
  });

  if (!personalityResponse.personality) {
    console.log(ansis.yellow(i18n.cancelled));
    return;
  }

  let directive = '';

  if (personalityResponse.personality === 'custom') {
    // Ask for custom directive
    const customResponse = await prompts({
      type: 'text',
      name: 'directive',
      message: i18n.enterCustomPersonality || 'Enter custom personality directive',
      validate: (value) => !!value || i18n.directiveCannotBeEmpty,
    });

    if (!customResponse.directive) {
      console.log(ansis.yellow(i18n.cancelled));
      return;
    }

    directive = customResponse.directive;
  } else {
    const selected = AI_PERSONALITIES.find((p) => p.id === personalityResponse.personality);
    if (selected) {
      directive = selected.directive[scriptLang];
    }
  }

  // Apply personality to personality.md
  await applyPersonalityDirective(directive);

  // Save personality choice to config
  updateZcfConfig({ aiPersonality: personalityResponse.personality });

  console.log(ansis.green(`✔ ${i18n.personalityConfigured || 'AI personality configured'}`));
}

async function applyPersonalityDirective(directive: string) {
  try {
    const personalityFile = join(CLAUDE_DIR, 'personality.md');

    // Write the personality directive to personality.md
    writeFile(personalityFile, directive);
  } catch (error) {
    console.error(ansis.red(I18N[readZcfConfig()?.preferredLang || 'en'].failedToApplyPersonality), error);
  }
}
