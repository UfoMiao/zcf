import prompts from '@posva/prompts';
import ansis from 'ansis';
import { readFileSync, writeFileSync } from 'node:fs';
import type { SupportedLang } from '../constants';
import { CLAUDE_MD_FILE, I18N } from '../constants';

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
    name: { 'zh-CN': '专业助手', en: 'Professional Assistant' },
    directive: {
      'zh-CN': '你是一位专业、严谨、高效的编程助手，回复简洁明了，注重技术准确性。',
      en: 'You are a professional, rigorous, and efficient programming assistant. Your responses are concise and focus on technical accuracy.'
    }
  },
  {
    id: 'catgirl',
    name: { 'zh-CN': '猫娘助手', en: 'Catgirl Assistant' },
    directive: {
      'zh-CN': '你是一位可爱的猫娘编程助手喵~ 在保持专业的同时，会适当地使用"喵"、"nya"等语气词，让对话更加轻松愉快喵~',
      en: 'You are a cute catgirl programming assistant nya~ While maintaining professionalism, you occasionally use "nya", "meow" and similar expressions to make conversations more enjoyable nya~'
    }
  },
  {
    id: 'friendly',
    name: { 'zh-CN': '友好助手', en: 'Friendly Assistant' },
    directive: {
      'zh-CN': '你是一位友好、耐心、善于解释的编程助手。会用通俗易懂的方式解释复杂概念，并经常给予鼓励。',
      en: 'You are a friendly, patient, and explanatory programming assistant. You explain complex concepts in easy-to-understand ways and often provide encouragement.'
    }
  },
  {
    id: 'mentor',
    name: { 'zh-CN': '导师模式', en: 'Mentor Mode' },
    directive: {
      'zh-CN': '你是一位经验丰富的编程导师。不仅提供解决方案，还会解释背后的原理，引导用户思考，培养独立解决问题的能力。',
      en: 'You are an experienced programming mentor. You not only provide solutions but also explain the principles behind them, guide users to think, and cultivate their ability to solve problems independently.'
    }
  },
  {
    id: 'custom',
    name: { 'zh-CN': '自定义', en: 'Custom' },
    directive: { 'zh-CN': '', en: '' }
  }
];

export async function configureAiPersonality(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  // Select personality
  const personalityResponse = await prompts({
    type: 'select',
    name: 'personality',
    message: i18n.selectAiPersonality || 'Select AI personality',
    choices: AI_PERSONALITIES.map(p => ({
      title: p.name[scriptLang],
      value: p.id,
      description: p.id !== 'custom' ? ansis.gray(p.directive[scriptLang].substring(0, 50) + '...') : ansis.gray(i18n.customPersonalityHint || 'Define your own personality')
    }))
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
      validate: (value) => !!value || 'Directive cannot be empty'
    });
    
    if (!customResponse.directive) {
      console.log(ansis.yellow(i18n.cancelled));
      return;
    }
    
    directive = customResponse.directive;
  } else {
    const selected = AI_PERSONALITIES.find(p => p.id === personalityResponse.personality);
    if (selected) {
      directive = selected.directive[scriptLang];
    }
  }
  
  // Apply personality to CLAUDE.md
  applyPersonalityDirective(directive);
  console.log(ansis.green(`✔ ${i18n.personalityConfigured || 'AI personality configured'}`));
}

function applyPersonalityDirective(directive: string) {
  try {
    let content = readFileSync(CLAUDE_MD_FILE, 'utf-8');
    
    // Remove existing personality directive if any
    const personalityMarkerStart = '<!-- AI_PERSONALITY_START -->';
    const personalityMarkerEnd = '<!-- AI_PERSONALITY_END -->';
    
    const startIndex = content.indexOf(personalityMarkerStart);
    const endIndex = content.indexOf(personalityMarkerEnd);
    
    if (startIndex !== -1 && endIndex !== -1) {
      content = content.substring(0, startIndex) + 
                content.substring(endIndex + personalityMarkerEnd.length);
    }
    
    // Add new personality directive after language directive
    const languageMarkerEnd = '<!-- AI_LANGUAGE_END -->';
    const languageEndIndex = content.indexOf(languageMarkerEnd);
    
    if (languageEndIndex !== -1) {
      const insertPosition = languageEndIndex + languageMarkerEnd.length;
      const personalitySection = `\n\n${personalityMarkerStart}\n${directive}\n${personalityMarkerEnd}`;
      content = content.substring(0, insertPosition) + 
                personalitySection + 
                content.substring(insertPosition);
    } else {
      // If no language marker, add at the beginning
      content = `${personalityMarkerStart}\n${directive}\n${personalityMarkerEnd}\n\n` + content;
    }
    
    writeFileSync(CLAUDE_MD_FILE, content, 'utf-8');
  } catch (error) {
    console.error(ansis.red('Failed to apply personality directive:'), error);
  }
}