import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { MarketingLayout } from './MarketingLayout';

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    householdSize: '3-4',
    topic: 'general',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSubmitted(true);
  };

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-forest-soft px-3 py-1 text-xs font-semibold text-secondary">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>Direct Support & Inquiries</span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Get in Touch With Our Team
          </h1>

          <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
            Have questions about multi-home setups, enterprise security, or how Family Essentials coordinates dual-career families? We typically respond in under 12 hours.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 max-w-5xl mx-auto">
          {/* Left Column: Direct info & Trust */}
          <div className="flex flex-col justify-between lg:col-span-5">
            <div className="flex flex-col gap-6">
              <Card className="p-6 border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="mail" className="text-[20px]" />
                  </div>
                  <div>
                    <h3 className="text-label-md font-bold text-on-surface">Email Support</h3>
                    <p className="text-body-sm text-secondary font-medium">support@familyessentials.app</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="verified_user" className="text-[20px]" />
                  </div>
                  <div>
                    <h3 className="text-label-md font-bold text-on-surface">Security & Privacy Inquiries</h3>
                    <p className="text-body-sm text-secondary font-medium">security@familyessentials.app</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="schedule" className="text-[20px]" />
                  </div>
                  <div>
                    <h3 className="text-label-md font-bold text-on-surface">Response Guarantee</h3>
                    <p className="text-body-sm text-on-surface-variant">
                      Under 12 hours on business days, 7 days a week.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-8 rounded-2xl bg-forest-soft/40 p-6 border border-secondary/20">
              <span className="text-label-sm font-bold text-secondary block">
                Looking for a live walkthrough?
              </span>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Select "Concierge Family Demo" in the inquiry form and our product team will schedule a 15-minute video call to help configure your family's initial geofences and board.
              </p>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7">
            <Card className="p-6 sm:p-8 border-outline-variant/30 bg-surface shadow-e2">
              {submitted ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest-soft text-secondary">
                    <Icon name="check_circle" className="text-[32px]" />
                  </div>
                  <h2 className="mt-4 text-headline-md font-bold text-on-surface">
                    Message Sent Successfully
                  </h2>
                  <p className="mt-2 text-body-md text-on-surface-variant max-w-sm mx-auto">
                    Thank you for reaching out, {form.name}. A member of our family logistics team will review your note and respond within 12 hours.
                  </p>
                  <Button
                    variant="soft"
                    size="md"
                    className="mt-6"
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: '', email: '', householdSize: '3-4', topic: 'general', message: '' });
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <h2 className="text-headline-sm font-bold text-on-surface">
                    Send Us a Message
                  </h2>

                  <div>
                    <Label htmlFor="contact-name">Your Full Name</Label>
                    <Input
                      id="contact-name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-email">Email Address</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@example.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="contact-size">Household Size</Label>
                      <Select
                        id="contact-size"
                        value={form.householdSize}
                        onChange={(e) => setForm({ ...form, householdSize: e.target.value })}
                      >
                        <option value="1-2">1-2 People</option>
                        <option value="3-4">3-4 People</option>
                        <option value="5-7">5-7 People</option>
                        <option value="8+">8+ People (Estate / Multi-Home)</option>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="contact-topic">Inquiry Topic</Label>
                      <Select
                        id="contact-topic"
                        value={form.topic}
                        onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      >
                        <option value="general">General Question</option>
                        <option value="demo">Concierge Family Demo</option>
                        <option value="estate">Multi-Home / Estate Setup</option>
                        <option value="billing">Billing & Subscriptions</option>
                        <option value="security">Security & Privacy</option>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="contact-message">How can we help?</Label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us about your family’s routine, questions, or any specific requirements..."
                      className="w-full rounded-xl border border-outline-variant/40 bg-canvas px-4 py-3 text-body-md text-on-surface placeholder:text-muted focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                    />
                  </div>

                  <Button type="submit" variant="primary" size="lg" className="w-full justify-center font-bold">
                    <span>Send Message to Team</span>
                    <Icon name="send" className="text-[18px]" />
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
