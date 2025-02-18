/* eslint-disable no-param-reassign */
import { SingleTypographyToken } from '@/types/tokens';
import { transformValue } from './helpers';
import { trackFromPlugin, notifyUI } from './notifiers';

export default async function setTextValuesOnTarget(
  target: TextNode | TextStyle,
  token: Pick<SingleTypographyToken, 'value' | 'description'>,
) {
  try {
    const { value, description } = token;
    if (typeof value !== 'string') {
      const {
        fontFamily,
        fontWeight,
        fontSize,
        lineHeight,
        letterSpacing,
        paragraphSpacing,
        paragraphIndent,
        textCase,
        textDecoration,
      } = value;
      const family = fontFamily?.toString() || (target.fontName !== figma.mixed ? target.fontName.family : '');
      const style = fontWeight?.toString() || (target.fontName !== figma.mixed ? target.fontName.style : '');

      try {
        await figma.loadFontAsync({ family, style });
        if (fontFamily || fontWeight) {
          target.fontName = {
            family,
            style,
          };
        }
      } catch (e) {
        const splitFontFamily = family.split(',');
        const candidateStyles = transformValue(style, 'fontWeights');
        const candidateFonts: { family: string; style: string }[] = [];
        splitFontFamily?.forEach((candidateFontFamily) => {
          const normalizedFontFamily = candidateFontFamily?.replace(/['"]/g, '').trim();
          if (candidateStyles.length > 0) {
            candidateStyles.forEach((candidateStyle) => {
              candidateFonts.push({
                family: normalizedFontFamily,
                style: candidateStyle,
              });
            });
          } else {
            candidateFonts.push({
              family: normalizedFontFamily,
              style,
            });
          }
        });

        let hasErrored = false;

        for (let i = 0; i < candidateFonts.length; i += 1) {
          let isApplied = false; // if font is applied then skip other font families
          await figma
            .loadFontAsync({ family: candidateFonts[i].family, style: candidateFonts[i].style })
            .then(() => {
              if (candidateFonts[i]) {
                target.fontName = {
                  family: candidateFonts[i].family,
                  style: candidateFonts[i].style,
                };
                isApplied = true;
              }
            })
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            .catch(() => {
              hasErrored = true;
            });
          if (isApplied) {
            hasErrored = false;
            break;
          }
        }
        if (hasErrored) {
          notifyUI(`Error setting font family/weight combination for ${family}/${style}`, { error: true });
          trackFromPlugin('Font not found', { family, style });
        }
      }
      if (typeof fontSize !== 'undefined') {
        target.fontSize = transformValue(fontSize, 'fontSizes');
      }
      if (typeof lineHeight !== 'undefined') {
        const transformedValue = transformValue(String(lineHeight), 'lineHeights');
        if (transformedValue !== null) {
          target.lineHeight = transformedValue;
        }
      }
      if (typeof letterSpacing !== 'undefined') {
        const transformedValue = transformValue(letterSpacing, 'letterSpacing');
        if (transformedValue !== null) {
          target.letterSpacing = transformedValue;
        }
      }
      if (typeof paragraphSpacing !== 'undefined') {
        target.paragraphSpacing = transformValue(paragraphSpacing, 'paragraphSpacing');
      }
      if (typeof paragraphIndent !== 'undefined') {
        target.paragraphIndent = transformValue(paragraphIndent, 'paragraphIndent');
      }
      if (textCase) {
        target.textCase = transformValue(textCase, 'textCase');
      }
      if (textDecoration) {
        target.textDecoration = transformValue(textDecoration, 'textDecoration');
      }
      if (description && 'description' in target) {
        target.description = description;
      }
    }
  } catch (e) {
    console.log('Error setting font on target', target, token, e);
  }
}
