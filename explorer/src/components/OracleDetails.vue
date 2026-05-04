<template>
  <div class="min-h-screen bg-background text-primary-text pt-16">
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div v-if="oracle" class="flex flex-col space-y-6">
        <div class="flex space-x-6">
          <div class="bg-white shadow overflow-hidden sm:rounded-lg flex-1">
            <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div class="flex flex-col">
                <h3 class="text-lg leading-6 font-medium text-primary-text">{{ oracle.title }}</h3>
                <p class="mt-1 max-w-2xl text-sm text-secondary-text">
                  <Address :address="oracle.address" :showFull="true" />
                </p>
              </div>
              <button @click="openResolutionModal" class="px-4 py-2 bg-highlight text-white rounded hover:opacity-80 transition-colors">
            Initiate Resolution
          </button>
            </div>
            <div class="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl class="sm:divide-y sm:divide-gray-200">
                <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-secondary-text">Status</dt>
                  <dd class="mt-1 text-sm text-primary-text sm:mt-0 sm:col-span-2">
                    <span :class="{
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium': true,
                      'bg-highlight/20 text-highlight': oracle.status === 'Active',
                      'bg-green-100 text-green-800': oracle.status === 'Resolved',
                      'bg-red-100 text-red-800': oracle.status === 'Error'
                    }">
                      {{ oracle.status }}
                    </span>
                  </dd>
                </div>
                <div v-if="oracle.outcome" class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-secondary-text">Outcome</dt>
                  <dd class="mt-1 text-sm text-primary-text sm:mt-0 sm:col-span-2">{{ oracle.outcome || 'Not yet determined' }}</dd>
                </div>

                <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-secondary-text">Description</dt>
                  <dd class="mt-1 text-sm text-primary-text sm:mt-0 sm:col-span-2">{{ oracle.description }}</dd>
                </div>
                <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-secondary-text">Potential Outcomes</dt>
                  <dd class="mt-1 text-sm text-primary-text sm:mt-0 sm:col-span-2">
                    <ul class="list-disc pl-5">
                      <li v-for="outcome in oracle.potential_outcomes" :key="outcome">{{ outcome }}</li>
                    </ul>
                  </dd>
                </div>
                <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-secondary-text">Rules</dt>
                  <dd class="mt-1 text-sm text-primary-text sm:mt-0 sm:col-span-2">
                    <ul class="list-disc pl-5">
                      <li v-for="rule in oracle.rules" :key="rule">{{ rule }}</li>
                    </ul>
                  </dd>
                </div>
                <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-secondary-text">Data Source Domains:</dt>
                  <dd class="mt-1 text-sm text-primary-text sm:mt-0 sm:col-span-2">
                    <ul v-if="oracle.data_source_domains.length > 0" class="list-disc pl-5">
                      <li v-for="domain in oracle.data_source_domains" :key="domain">{{ domain }}</li>
                    </ul>
                    <div v-else>This oracle uses fixed resolution URLs</div>
                  </dd>
                </div>
                <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-secondary-text">Resolution URLs:</dt>
                  <dd class="mt-1 text-sm text-primary-text sm:mt-0 sm:col-span-2">
                    <ul v-if="oracle.resolution_urls && oracle.resolution_urls.length > 0" class="list-disc pl-5">
                      <li v-for="url in oracle.resolution_urls" :key="url">{{ url }}</li>
                    </ul>
                    <div v-else>This oracle uses dynamic evidence URLs</div>
                  </dd>
                </div>

                <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-secondary-text">Earliest Resolution Date</dt>
                  <dd class="mt-1 text-sm text-primary-text sm:mt-0 sm:col-span-2">{{ formatDate(oracle.earliest_resolution_date) }}</dd>
                </div>
                <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-secondary-text">Analysis</dt>
                  <dd class="mt-1 text-sm text-primary-text sm:mt-0 sm:col-span-2">
                    <div v-if="oracle.analysis" class="whitespace-pre-wrap break-words">
                      <div v-if="oracle.analysis.justification || oracle.analysis.reasoning">{{ oracle.analysis.justification || oracle.analysis.reasoning }}</div>
                      <div v-else>No analysis available</div>
                    </div>
                    <div v-else>No analysis available</div>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div class="bg-white shadow overflow-hidden sm:rounded-lg flex-1">
            <div class="px-4 py-5 sm:px-6">
              <h3 class="text-lg leading-6 font-medium text-primary-text">Transactions</h3>
            </div>
            <div class="p-4 space-y-4">
              <div v-for="tx in transactions"
                   :key="tx.hash"
                   class="bg-gray-100 shadow rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                   @click="openTransactionModal(tx)"
              >
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm font-medium text-highlight truncate max-w-[70%]">
                    {{ tx.hash }}
                  </p>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'"
                  >
                    {{ tx.status }}
                  </span>
                </div>
                <div class="space-y-2">
                  <p class="text-sm text-secondary-text">Created at: {{ formatDate(tx.created_at) }}</p>
                  <p class="text-sm text-secondary-text">Type: {{ tx.data?.contract_address ? "Deploy" : "Resolution" }}</p>
                  <div v-if="tx.status !== 'PENDING'" class="pt-2">
                    <h4 class="text-sm font-medium text-primary-text mb-1">Validators and Votes:</h4>
                    <template v-if="tx.consensus_data?.votes && Object.entries(tx.consensus_data.votes).length > 0">
                      <ul class="space-y-1">
                        <li v-for="validator in Object.entries(tx.consensus_data.votes)"
                            :key="validator[0]"
                            class="text-sm text-secondary-text"
                        >
                          {{ validator[0] }}: {{ tx.consensus_data.votes[validator[0]] || 'No vote' }}
                        </li>
                      </ul>
                    </template>
                    <template v-else>
                      <p class="text-sm text-secondary-text">Leader only execution</p>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8">
        <p class="text-xl text-secondary-text">Loading oracle details...</p>
      </div>
    </main>

    <!-- Transaction DetailsModal -->
    <div v-if="showTransactionModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" @click="closeTransactionModal">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white" @click.stop>
        <div class="mt-3">
          <h3 class="text-lg leading-6 font-medium text-primary-text mb-6">Transaction Details</h3>

          <!-- General Information -->
          <div class="mb-6">
            <h4 class="text-md font-semibold mb-3">General Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
              <div>
                <p class="text-sm mb-1"><span class="font-medium">Type:</span> {{ selectedTransactionObject?.data?.contract_address ? "Deploy" : "Resolution" }}</p>
                <p class="text-sm mb-1"><span class="font-medium">Status:</span> {{ selectedTransactionObject?.status }}</p>
                <p class="text-sm mb-1"><span class="font-medium">Appealed:</span> {{ selectedTransactionObject?.appealed ? 'Yes' : 'No' }}</p>
                <p class="text-sm mb-1"><span class="font-medium">Created At:</span> {{ selectedTransactionObject?.created_at ? new Date(selectedTransactionObject.created_at).toLocaleString() : '' }}</p>
              </div>
              <div>
                <p class="text-sm"><span class="font-medium">Calldata:</span></p>
                <div class="bg-gray-100 p-2 rounded space-y-2">
                  <div v-if="decodedCalldata" class="text-sm">
                    <p><span class="font-medium">Method:</span> {{ decodedCalldata.method }}</p>
                    <div class="mt-1" v-if="decodedCalldata.args.length > 0">
                      <p><span class="font-medium">Arguments:</span></p>
                      <p>{{ decodedCalldata.args }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Leader's Execution -->
          <div class="mb-6">
            <h4 class="text-md font-semibold mb-3">Leader's Execution</h4>
            <div class="bg-gray-50 p-4 rounded">
              <p class="text-sm mb-2"><span class="font-medium">Address:</span> {{ leaderReceipt?.node_config?.address }}</p>
              <p class="text-sm mb-2"><span class="font-medium">Execution Result: </span>
                <span :class="{
                    'text-green-600': leaderReceipt?.execution_result === 'SUCCESS',
                    'text-red-600': leaderReceipt?.execution_result === 'ERROR'
                  }">{{ leaderReceipt?.execution_result }}</span>
              </p>
              <div class="mt-3" v-if="leaderReceipt?.eq_outputs && Object.keys(leaderReceipt.eq_outputs).length > 0">
                <p class="text-sm font-medium mb-1">EQ Outputs:</p>
                <div v-for="(output, key) in leaderReceipt.eq_outputs" :key="key"
                     class="bg-gray-200 p-2 rounded mb-4">
                  <div class="text-sm space-y-2">
                    <template v-if="parseEqOutput(decodeBase64(String(output)))">
                      <div v-for="(value, k) in parseEqOutput(decodeBase64(String(output)))" :key="k"
                           class="border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                        <span class="font-medium capitalize">{{ formatKey(String(k)) }}:</span>
                        <p class="mt-1 pl-4 text-gray-600">{{ value }}</p>
                      </div>
                    </template>
                    <p v-else class="break-all">{{ decodeBase64(String(output)) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Validators -->
          <div class="mb-6">
            <h4 class="text-md font-semibold mb-3">Validators</h4>
            <div class="space-y-4">
              <div v-for="validator in selectedTransactionObject?.consensus_data?.validators" :key="validator.node_config.address"
                   class="bg-gray-50 p-4 rounded">
                <p class="text-sm mb-2"><span class="font-medium">Address:</span> {{ validator.node_config.address }}</p>
                <p class="text-sm mb-2"><span class="font-medium">Vote: </span>
                  <span :class="{
                    'text-green-600': validator.vote === 'agree',
                    'text-red-600': validator.vote === 'disagree'
                  }">{{ validator.vote }}</span>
                </p>
                <p class="text-sm mb-2"><span class="font-medium">Execution Result:</span> {{ validator.execution_result }}</p>
              </div>
            </div>
          </div>

          <!-- Node Configurations -->
          <div class="mb-6">
            <h4 class="text-md font-semibold mb-3">Node Configurations</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="participant in nodeConfigParticipants"
                   :key="participant.node_config.address"
                   class="bg-gray-50 p-4 rounded">
                <p class="text-sm font-medium mb-1">{{ participant.mode === 'leader' ? 'Leader' : 'Validator' }}</p>
                <p class="text-sm"><span class="font-medium">Provider:</span> {{ participant.node_config.provider }}</p>
                <p class="text-sm"><span class="font-medium">Model:</span> {{ participant.node_config.model }}</p>
                <p class="text-sm"><span class="font-medium">Stake:</span> {{ participant.node_config.stake }}</p>
              </div>
            </div>
          </div>

          <!-- Raw JSON -->
          <div class="mb-6">
            <h4 class="text-md font-semibold mb-3">Raw Transaction Data</h4>
            <div class="bg-gray-50 p-4 rounded">
              <pre class="text-left whitespace-pre-wrap break-words text-sm">{{ prettyJson }}</pre>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end space-x-4">
            <button
              @click="copyToClipboard"
              class="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-300"
            >
              Copy to Clipboard
            </button>
            <button
              @click="closeTransactionModal"
              class="px-4 py-2 bg-highlight text-white text-base font-medium rounded-md shadow-sm hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-highlight"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Resolution Modal -->
    <div v-if="showResolutionModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" @click="closeResolutionModal">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white" @click.stop>
        <div class="mt-3 text-center">
          <h3 class="text-lg leading-6 font-medium text-primary-text">Provide a URL for resolution</h3>
          <div class="mt-2 px-7 py-3">
            <input v-model="resolutionEvidence" type="text" class="w-full h-12 border border-gray-300 rounded-md p-2" placeholder="Enter evidence URL">
          </div>
          <div class="items-center px-4 py-3 space-y-2">
            <button
              @click="resolveOracle"
              class="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-300"
            >
              Submit Resolution
            </button>
            <button
              @click="closeResolutionModal"
              class="px-4 py-2 bg-highlight text-white text-base font-medium rounded-md w-full shadow-sm hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-highlight"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { Oracle, useGenlayerStore } from '../stores/genlayerStore';

import Address from './Address.vue';
import { onMounted, ref, computed, onUnmounted } from 'vue';
import type { Address as AddressType } from 'genlayer-js/types';

const route = useRoute();
const genlayerStore = useGenlayerStore();
const oracle = ref<Oracle>();

// Loose Transaction shape — `sim_getTransactionsForAddress` payload still
// varies between studio versions, so most fields are typed as optional/any.
// The new GenLayer SDK exposes `consensus_data.leader_receipt` as an array.
interface LeaderReceiptShape {
  args?: any;
  class_name?: string;
  contract_state?: string;
  eq_outputs?: Record<string, string>;
  error?: string | null;
  execution_result?: string;
  gas_used?: number;
  method?: string;
  mode?: string;
  node_config?: {
    address?: string;
    config?: Record<string, unknown>;
    model?: string;
    plugin?: string;
    plugin_config?: Record<string, unknown>;
    provider?: string;
    stake?: number;
  };
  vote?: string;
}

interface Transaction {
  consensus_data?: {
    final?: boolean;
    validators?: Array<{
      node_config: { address: string };
      vote?: string;
      execution_result?: string;
    }>;
    votes?: Record<string, string>;
    leader_receipt?: LeaderReceiptShape | LeaderReceiptShape[];
  };
  created_at?: string;
  data?: {
    function_args?: string;
    function_name?: string;
    contract_address?: string;
    calldata?: string;
  };
  from_address?: string;
  hash?: string;
  status?: string;
  appealed?: boolean;
}

const transactions = ref<Transaction[]>([]);
const showTransactionModal = ref(false);
const selectedTransaction = ref<Transaction | null>(null);
const showResolutionModal = ref(false);
const resolutionEvidence = ref<string>("");
const refreshInterval = ref<number>();

onMounted(async () => {
  loadOracle();
  await refreshOracle();
  refreshInterval.value = window.setInterval(async () => {
    await refreshOracle();
  }, 5000);
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});

async function loadOracle() {
  oracle.value = (await genlayerStore.oracles).find(oracle => oracle.address === route.params.address);
  try {
    transactions.value = (await genlayerStore.client.request({
      method: "sim_getTransactionsForAddress",
      params: [route.params.address as string],
    } as any)) as Transaction[];
  } catch (e) {
    console.warn("sim_getTransactionsForAddress unavailable on this network", e);
    transactions.value = [];
  }
  if (oracle.value?.status === "Resolved") {
    clearInterval(refreshInterval.value);
  }
}

async function refreshOracle() {
  await genlayerStore.fetchOracle(route.params.address as AddressType);
  await loadOracle();
}

async function resolveOracle() {
  await genlayerStore.resolveOracle(route.params.address as AddressType, resolutionEvidence.value);
  await refreshOracle();
  await closeResolutionModal();
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Not specified';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

function openTransactionModal(tx: Transaction) {
  selectedTransaction.value = tx;
  showTransactionModal.value = true;
}

function closeTransactionModal() {
  showTransactionModal.value = false;
  selectedTransaction.value = null;
}

function openResolutionModal() {
  if (oracle.value?.resolution_urls && oracle.value.resolution_urls.length > 0) {
    resolveOracle();
  } else {
    resolutionEvidence.value = "";
    showResolutionModal.value = true;
  }
}

function closeResolutionModal() {
  showResolutionModal.value = false;
  resolutionEvidence.value = "";
}

// Normalize leader_receipt — old simulator returned an object, new SDK returns an array.
function normalizeLeaderReceipt(
  raw: LeaderReceiptShape | LeaderReceiptShape[] | undefined
): LeaderReceiptShape | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

const leaderReceipt = computed<LeaderReceiptShape | undefined>(() =>
  normalizeLeaderReceipt(selectedTransaction.value?.consensus_data?.leader_receipt)
);

const selectedTransactionObject = computed(() => {
  if (!selectedTransaction.value) return null;
  return {
    ...selectedTransaction.value,
    consensus_data: selectedTransaction.value.consensus_data
      ? {
          ...selectedTransaction.value.consensus_data,
          leader_receipt: leaderReceipt.value,
          validators: selectedTransaction.value.consensus_data.validators?.map((validator: any) => ({
            ...validator,
            eq_outputs: undefined,
          })),
        }
      : undefined,
  };
});

const nodeConfigParticipants = computed(() => {
  const out: Array<{
    mode?: string;
    node_config: { address?: string; provider?: string; model?: string; stake?: number };
  }> = [];
  if (leaderReceipt.value?.node_config) {
    out.push({ mode: 'leader', node_config: leaderReceipt.value.node_config });
  }
  for (const v of selectedTransaction.value?.consensus_data?.validators ?? []) {
    out.push({ mode: 'validator', node_config: v.node_config });
  }
  return out;
});

const prettyJson = computed(() => {
  if (!selectedTransactionObject.value) return '';
  return JSON.stringify(selectedTransactionObject.value, null, 2);
});

function copyToClipboard() {
  if (selectedTransaction.value) {
    navigator.clipboard.writeText(JSON.stringify(selectedTransaction.value, null, 2))
      .then(() => {
        alert('Transaction data copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy transaction data. Please try again.');
      });
  }
}

const decodeBase64 = (encodedString?: string) => {
  if (!encodedString || typeof window === 'undefined') {
    return '';
  }
  try {
    return window.atob(encodedString);
  } catch {
    return encodedString;
  }
};

const decodedCalldata = computed(() => {
  const rawCalldata = decodeBase64(selectedTransactionObject.value?.data?.calldata);
  if (!rawCalldata) return null;

  try {
    const parts = rawCalldata.split('method<');
    const args = parts[0]
      .replace('args', '')
      .replace('ì', '')
      .replace(/[\x00-\x1F\x7F-\xFF]/g, '')
      .trim();
    const method = parts[1]?.replace('>', '') || 'Constructor';
    return { method, args };
  } catch (error) {
    console.error('Error parsing calldata:', error);
    return null;
  }
});

function cleanJsonString(str: string): string {
  str = str.replace(/^```\w*\s*|\s*```$/g, '');
  if (str.includes('{')) {
    const jsonMatch = str.match(/{[\s\S]*}/);
    return jsonMatch ? jsonMatch[0] : str;
  }
  return str;
}

function parseEqOutput(output: string): Record<string, any> | null {
  try {
    const cleanedOutput = cleanJsonString(output);
    return JSON.parse(cleanedOutput);
  } catch {
    return null;
  }
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
</script>

<style scoped>
pre {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
