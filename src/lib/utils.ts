import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-lg',
            'display-md',
            'display-sm',
            'headline-lg',
            'headline-md',
            'headline-sm',
            'body-lg',
            'body-md',
            'body-sm',
            'body-xs',
            'label-lg',
            'label-md',
            'label-sm',
            'label-xs',
          ],
        },
      ],
      shadow: [
        {
          shadow: ['e1', 'e2', 'e3', 'e4', 'clay-sm', 'inset', 'inset-sm'],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return customTwMerge(clsx(inputs));
}
