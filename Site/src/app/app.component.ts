import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  sections: { name: string; tabs: { title: string; url: string }[] }[] = [
    {
      name: 'Work',
      tabs: [
        { title: 'Gmail', url: 'https://mail.google.com' },
        { title: 'Calendar', url: 'https://calendar.google.com' },
        { title: 'Notion', url: 'https://www.notion.so' },
        { title: 'Slack', url: 'https://slack.com' },
        { title: 'Jira', url: 'https://jira.atlassian.com' }
      ]
    },
    {
      name: 'Dev Tools',
      tabs: [
        { title: 'GitHub', url: 'https://github.com' },
        { title: 'Stack Overflow', url: 'https://stackoverflow.com' },
        { title: 'Vercel', url: 'https://vercel.com' },
        { title: 'Netlify', url: 'https://www.netlify.com' },
        { title: 'Cloudflare', url: 'https://www.cloudflare.com' }
      ]
    },
    {
      name: 'News',
      tabs: [
        { title: 'Hacker News', url: 'https://news.ycombinator.com' },
        { title: 'Reddit', url: 'https://www.reddit.com' },
        { title: 'The Verge', url: 'https://www.theverge.com' },
        { title: 'BBC', url: 'https://www.bbc.com' },
        { title: 'NYTimes', url: 'https://www.nytimes.com' }
      ]
    }
  ];

  getFavicon(url: string): string {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    } catch {
      return '';
    }
  }

  private normalizeUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  addSection(): void {
    const name = (window.prompt('New section name:') || '').trim();
    if (!name) return;
    this.sections.push({ name, tabs: [] });
  }

  addTab(sectionIndex: number): void {
    const urlInput = window.prompt('New tab URL (e.g. example.com):');
    if (!urlInput) return;
    const url = this.normalizeUrl(urlInput);
    try {
      const u = new URL(url);
      const suggestedTitle = u.hostname.replace(/^www\./, '');
      const title = (window.prompt('Tab title:', suggestedTitle) || '').trim() || suggestedTitle;
      this.sections[sectionIndex].tabs.push({ title, url });
    } catch {
      window.alert('Invalid URL');
    }
  }
}
