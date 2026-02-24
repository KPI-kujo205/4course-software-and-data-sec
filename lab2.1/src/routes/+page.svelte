<script lang="ts">
	let tgBotLink = 'lol';
	let step = $state(1);
	let tgTag = $state('');
	let tgCode = $state('');
	let password = $state('');
	let twoFaCode = $state('');
	let qrCodeUrl = $state(''); // base64 qr code

	async function nextStep(e: Event) {
		e.preventDefault();
		step += 1;
	}
</script>

<div class="auth-box">
	{#if step === 1}
		<form onsubmit={nextStep}>
			<p>
				*Before entering the code, please make sure you have started a conversation with our
				telegram bot, <a href={tgBotLink} target="_blank" rel="noopener">visit this link</a>
			</p>
			<h1>Your telegram tag</h1>
			<input type="text" bind:value={tgTag} placeholder="@someTag" required />
			<button type="submit">Send Tag</button>
		</form>
	{:else if step === 2}
		<form onsubmit={nextStep}>
			<h1>Verify</h1>
			<p>Code sent to Telegram</p>
			<input type="text" bind:value={tgCode} placeholder="000000" required />
			<button type="submit">Verify</button>
			<button type="button" class="link" onclick={() => (step = 1)}>Back</button>
		</form>
	{:else if step === 3}
		<form onsubmit={nextStep}>
			<h1>Security</h1>
			<input type="password" bind:value={password} placeholder="Password" required />

			<div class="qr">
				{#if qrCodeUrl}
					<img src={qrCodeUrl} alt="2FA" />
				{:else}
					<div class="placeholder">QR Code</div>
				{/if}
			</div>

			<input type="text" bind:value={twoFaCode} placeholder="2FA Code" required />
			<button type="submit">Finish</button>
		</form>
	{:else}
		<div class="success">
			<h1>Done</h1>
			<p>Account created.</p>
			<button onclick={() => location.reload()}>Restart</button>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		font-family: ui-sans-serif, system-ui, sans-serif;
		display: grid;
		place-items: center;
		height: 100vh;
		margin: 0;
		color: #000;
	}

	.auth-box {
		width: 300px;
		padding: 20px;
		border: 1px solid #eee;
	}

	h1 {
		font-size: 1.2rem;
		margin: 0 0 1rem;
	}
	p {
		font-size: 0.8rem;
		color: #666;
	}

	input {
		width: 100%;
		padding: 8px;
		margin-bottom: 10px;
		border: 1px solid #ccc;
		box-sizing: border-box;
	}

	button {
		width: 100%;
		padding: 8px;
		background: #000;
		color: #fff;
		border: none;
		border-radius: 5px;
		cursor: pointer;
	}

	.link {
		background: none;
		color: #666;
		font-size: 0.8rem;
		text-decoration: underline;
		margin-top: 10px;
	}

	.qr {
		background: #f9f9f9;
		margin: 10px 0;
		display: grid;
		place-items: center;
		min-height: 150px;
		border: 1px solid #eee;
	}

	.placeholder {
		color: #ccc;
		font-size: 0.7rem;
	}
</style>
