<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'open-stall'): void;
  (e: 'go-create'): void;
}>();

// FAQ accordion state
const openFaq = ref<number | null>(0);

function toggleFaq(index: number) {
  openFaq.value = openFaq.value === index ? null : index;
}

const faqs = [
  {
    q: 'Do I need to create an account or pay monthly fees?',
    a: 'No accounts, no email signups, and 0% platform swipe fees. NimStall is peer-to-peer. Your Nimiq Pay wallet is your merchant account, and all payments settle directly on-chain.',
  },
  {
    q: 'How does payment verification work?',
    a: 'Each order has a unique order reference embedded in the transaction memo. When paid, the transaction is verified on the Nimiq and Polygon blockchains before generating a verified receipt.',
  },
  {
    q: 'Where are my products and order history stored?',
    a: 'All catalog items and order records are saved locally in your browser/device storage. No centralized server holds your store data.',
  },
  {
    q: 'Which currencies are supported?',
    a: 'Native NIM on the Nimiq blockchain and USDT on Polygon PoS. Customers can pick their preferred token with a single tap at checkout.',
  },
  {
    q: 'Can customers pay from any device?',
    a: 'Yes. The checkout QR code and link (#order=...) contain the full payment parameters, allowing any phone camera or Nimiq Pay wallet to load the order instantly.',
  },
];
</script>

<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-clean">
      <div class="hero-badge-pill">
        <span class="dot-live"></span>
        <span>Decentralized Point-of-Sale</span>
      </div>

      <h1 class="hero-headline">
        Instant Crypto POS.<br />
        <span class="hero-gradient">Zero Middlemen.</span>
      </h1>

      <p class="hero-subtext">
        Accept native NIM and Polygon USDT directly to your wallet. No merchant fees, no expensive hardware, no waiting for payouts.
      </p>

      <div class="hero-cta-group">
        <button class="btn btn-primary btn-lg" type="button" @click="emit('open-stall')">
          <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <span>Launch Cashier ➔</span>
        </button>

        <button class="btn btn-outline btn-lg" type="button" @click="emit('go-create')">
          <span>Stall Setup</span>
        </button>
      </div>

      <!-- Compact, Mobile-Optimized Preview Card -->
      <div class="preview-card-wrap">
        <div class="terminal-mini-card">
          <div class="mini-card-header">
            <span class="mini-chip">Active Terminal</span>
            <span class="mini-currency">NIM • USDT</span>
          </div>

          <div class="mini-card-body">
            <div class="mini-stall-info">
              <span class="mini-stall-name">Marketplace Stall</span>
              <span class="mini-stall-desc">Ready for on-chain checkout</span>
            </div>

            <div class="mini-items-row">
              <div class="mini-sample-item">
                <span class="sample-emoji">☕</span>
                <span class="sample-title">Coffee</span>
                <span class="sample-price">5.0 NIM</span>
              </div>
              <div class="mini-sample-item">
                <span class="sample-emoji">🥐</span>
                <span class="sample-title">Pastry</span>
                <span class="sample-price">6.5 NIM</span>
              </div>
            </div>

            <button class="btn btn-primary btn-sm btn-block" type="button" @click="emit('open-stall')">
              Open Cashier Terminal
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 3 Simple Steps -->
    <section class="flow-section">
      <div class="section-tag">Simple Workflow</div>
      <h2 class="section-title-clean">How NimStall Works</h2>

      <div class="steps-grid">
        <div class="step-box">
          <div class="step-num">01</div>
          <h3>Setup Your Stall</h3>
          <p>Name your store and add items with NIM or USDT prices. Payout addresses connect in one tap.</p>
        </div>

        <div class="step-box">
          <div class="step-num">02</div>
          <h3>Generate Order QR</h3>
          <p>Add items to cart and hit checkout. NimStall creates a dynamic payment QR code in seconds.</p>
        </div>

        <div class="step-box">
          <div class="step-num">03</div>
          <h3>Direct Settlement</h3>
          <p>Customer scans with Nimiq Pay and confirms. Funds land straight into your wallet on-chain.</p>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq-clean-section">
      <div class="section-tag">FAQ</div>
      <h2 class="section-title-clean">Frequently Asked Questions</h2>

      <div class="faq-list">
        <div
          v-for="(faq, idx) in faqs"
          :key="idx"
          class="faq-row"
          :class="{ active: openFaq === idx }"
          @click="toggleFaq(idx)"
        >
          <div class="faq-q">
            <span>{{ faq.q }}</span>
            <span class="faq-icon">{{ openFaq === idx ? '−' : '+' }}</span>
          </div>
          <div v-show="openFaq === idx" class="faq-a">
            <p>{{ faq.a }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Clean, Professional Footer (NO DEVELOPER HANDLES) -->
    <footer class="clean-footer">
      <div class="footer-wrap">
        <div class="footer-top">
          <div class="footer-brand-lockup">
            <img src="/logo.png" alt="NimStall" class="footer-mini-logo" />
            <span class="footer-brand-title">NimStall</span>
          </div>
          <p class="footer-lead">Decentralized Point-of-Sale for Nimiq Pay and Polygon rails.</p>
        </div>

        <div class="footer-nav">
          <a href="#sell" @click.prevent="emit('open-stall')">Cashier</a>
          <a href="#create" @click.prevent="emit('go-create')">Stall Setup</a>
          <a href="https://nimiq.com" target="_blank" rel="noopener">Nimiq Network</a>
          <a href="https://nimiq.dev/mini-apps" target="_blank" rel="noopener">Mini App Docs</a>
        </div>

        <div class="footer-bottom">
          <span>© 2026 NimStall. Built on Nimiq Mini App SDK.</span>
          <span class="footer-pill">● Mainnet Ready</span>
        </div>
      </div>
    </footer>
  </div>
</template>
