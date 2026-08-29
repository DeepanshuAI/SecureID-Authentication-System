document.addEventListener('DOMContentLoaded', () => {
    // -- Global TEST_MODE Handler --
    if (typeof TEST_MODE !== 'undefined' && TEST_MODE) {
        const testModeContainer = document.getElementById('testModeContainer');
        const testOtpBtn = document.getElementById('testOtpBtn');
        const testOtpDisplay = document.getElementById('testOtpDisplay');
        
        if (testModeContainer && testOtpBtn && testOtpDisplay) {
            testModeContainer.style.display = 'block';
            
            testOtpBtn.addEventListener('click', async () => {
                const challengeId = sessionStorage.getItem('challengeId');
                if (!challengeId) {
                    testOtpDisplay.textContent = 'Error: No challenge ID found in session.';
                    testOtpDisplay.style.color = 'var(--error-color)';
                    return;
                }
                
                const res = await api.get(`/test/otp/${challengeId}`);
                if (res.success) {
                    testOtpDisplay.textContent = `Test OTP: ${res.otp} (${res.channel})`;
                    testOtpDisplay.style.color = 'var(--primary-blue)';
                    
                    // Optional: automatically fill it in for evaluator convenience
                    const inputs = document.querySelectorAll('.otp-box');
                    if (inputs.length === 6 && res.otp.length === 6) {
                        inputs.forEach((input, index) => {
                            input.value = res.otp[index];
                        });
                        inputs[5].focus();
                    }
                } else {
                    testOtpDisplay.textContent = `Error: ${res.message}`;
                    testOtpDisplay.style.color = 'var(--error-color)';
                }
            });
        }
    }

    // -- Reusable OTP Input Handler --
    const setupOtpInputs = (selector) => {
        const inputs = document.querySelectorAll(selector);
        if (inputs.length !== 6) return;

        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = e.clipboardData.getData('text').trim();
                if (!/^\d{1,6}$/.test(pasteData)) return;
                
                for (let i = 0; i < pasteData.length && index + i < 6; i++) {
                    inputs[index + i].value = pasteData[i];
                    if (index + i < 5) inputs[index + i + 1].focus();
                }
            });
        });
        return inputs;
    };

    
    // -- Registration Form --
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('togglePassword');
        const strengthContainer = document.getElementById('passwordStrength');
        const strengthText = document.getElementById('strengthText');

        toggleBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleBtn.textContent = 'HIDE';
            } else {
                passwordInput.type = 'password';
                toggleBtn.textContent = 'SHOW';
            }
        });

        const confirmInput = document.getElementById('confirmPassword');
        const checkLength = document.getElementById('checkLength');
        const checkUpper = document.getElementById('checkUpper');
        const checkNumber = document.getElementById('checkNumber');
        const checkSpecial = document.getElementById('checkSpecial');
        const matchError = document.getElementById('passwordMatchError');

        // Password checklist logic
        passwordInput.addEventListener('input', (e) => {
            const val = e.target.value;

            //strength calculator
            if (val.length === 0) {
                strengthContainer.style.display = 'none';
            } else {
                strengthContainer.style.display = 'block';
            let score=0;

            if(val.length >= 8) score++;
            if(val.match(/[A-Z]/)) score++;
            if(val.match(/[0-9]/)) score++;
            if(val.match(/[^A-Za-z0-9]/)) score++;

            strengthText.className='';
            strengthText.dataset.score=score;

            if(score<2) {
                strengthText.textContent='Weak';
                strengthText.classList.add('strength-weak');
            }
            else if(score<4) {
                strengthText.textContent='Medium';
                strengthText.classList.add('strength-medium');
            }
            else {
                strengthText.textContent='Strong';
                strengthText.classList.add('strength-strong');
            }
        } 
            if (checkLength) val.length >= 8 ? checkLength.classList.add('valid') : checkLength.classList.remove('valid');
            if (checkUpper) val.match(/[A-Z]/) ? checkUpper.classList.add('valid') : checkUpper.classList.remove('valid');
            if (checkNumber) val.match(/[0-9]/) ? checkNumber.classList.add('valid') : checkNumber.classList.remove('valid');
            if (checkSpecial) val.match(/[^A-Za-z0-9]/) ? checkSpecial.classList.add('valid') : checkSpecial.classList.remove('valid');
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const mobile = document.getElementById('mobile').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const terms = document.getElementById('terms').checked;

            if (password !== confirmPassword) {
                document.getElementById('passwordMatchError').style.display = 'block';
                return;
            } else {
                document.getElementById('passwordMatchError').style.display = 'none';
            }

            //prevent weak pasword login
            const currentScore=parseInt(strengthText.dataset.score||0);

            if(currentScore<2) {
                UI.showNotification('Password is too weak. Please meet at least 2 requirements.', 'error');
                return;
            }

            if (!terms) {
                UI.showNotification('You must agree to the Terms of Service.', 'error');
                return;
            }

            const btn = document.getElementById('registerBtn');
            btn.disabled = true;
            btn.textContent = 'Creating...';

            const data = {
                fullName,
                email,
                mobile,
                password
            };

            const res = await api.post('/register', data);
            
            btn.disabled = false;
            btn.textContent = 'Create Account';

            if (res.success) {
                UI.showNotification(res.message, 'success');
                sessionStorage.setItem('challengeId', res.challengeId);
                setTimeout(() => window.location.href = '/otp', 1500);
            } else {
                UI.showNotification(res.message, 'error');
            }
        });
    }

    // -- Login Form --
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const toggleBtn = document.getElementById('togglePassword');
        const passInput = document.getElementById('password');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (passInput.type === 'password') {
                    passInput.type = 'text';
                    toggleBtn.textContent = 'HIDE';
                } else {
                    passInput.type = 'password';
                    toggleBtn.textContent = 'SHOW';
                }
            });
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                identifier: document.getElementById('identifier').value,
                password: passInput.value
            };

            const btn = document.getElementById('loginBtn');
            btn.disabled = true;
            btn.textContent = 'Logging in...';

            const res = await api.post('/login', data);
            
            btn.disabled = false;
            btn.textContent = 'Log In';

            if (res.success) {
                sessionStorage.setItem('tempUserId', res.userId);
                window.location.href = '/login-mfa-select';
            } else {
                UI.showNotification(res.message, 'error');
            }
        });
    }

    // -- Login MFA Select Form --
    const loginMfaSelectForm = document.getElementById('loginMfaSelectForm');
    if (loginMfaSelectForm) {
        const options = document.querySelectorAll('.mfa-option');
        let selectedMethod = 'authenticator';

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedMethod = opt.getAttribute('data-method');
            });
        });

        loginMfaSelectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = sessionStorage.getItem('tempUserId');
            if (!userId) {
                UI.showNotification('Session expired. Please log in again.', 'error');
                return;
            }

            const btn = document.getElementById('sendCodeBtn');
            btn.disabled = true;

            const res = await api.post('/login/mfa-select', { userId, mfaMethod: selectedMethod });
            btn.disabled = false;

            if (res.success) {
                sessionStorage.setItem('challengeId', res.challengeId);
                UI.showNotification(res.message, 'success');
                if (selectedMethod === 'authenticator') {
                    setTimeout(() => window.location.href = '/mfa-verify', 1500);
                } else {
                    setTimeout(() => window.location.href = '/otp', 1500);
                }
            } else {
                UI.showNotification(res.message, 'error');
            }
        });
    }

    // -- OTP Form --
    const otpForm = document.getElementById('otpForm');
    if (otpForm) {
        const inputs = setupOtpInputs('.otp-box');


        // Timer
        let time = 180; // 3 mins
        const timerEl = document.getElementById('timer');
        const interval = setInterval(() => {
            if (time <= 0) {
                clearInterval(interval);
                timerEl.textContent = '00:00';
                timerEl.style.color = 'var(--error-color)';
                return;
            }
            time--;
            const m = Math.floor(time / 60).toString().padStart(2, '0');
            const s = (time % 60).toString().padStart(2, '0');
            timerEl.textContent = `${m}:${s}`;
        }, 1000);

        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            let otp = '';
            inputs.forEach(i => otp += i.value);
            
            const challengeId = sessionStorage.getItem('challengeId');
            if (!challengeId) {
                UI.showNotification('Session expired. Please start over.', 'error');
                return;
            }

            const btn = document.getElementById('verifyBtn');
            btn.disabled = true;

            const res = await api.post('/otp/verify', { challengeId, otp });
            
            btn.disabled = false;

            if (res.success) {
                UI.showNotification(res.message, 'success');
                
                if (res.nextStep === 'sms') {
                    // Start SMS flow
                    sessionStorage.setItem('challengeId', res.challengeId);
                    
                    // Clear the test mode display if it was used for the email OTP
                    const testOtpDisplay = document.getElementById('testOtpDisplay');
                    if (testOtpDisplay) testOtpDisplay.textContent = '';
                    
                    setTimeout(() => {
                        inputs.forEach(i => i.value = '');
                        inputs[0].focus();
                        time = 180;
                        document.querySelector('.card h1').textContent = 'Check your mobile';
                        document.getElementById('otpSubtitle').textContent = 'We sent a verification code via SMS.';
                    }, 1500);
                } else if (res.nextStep === 'mfa_setup') {
                    setTimeout(() => window.location.href = '/mfa-setup', 1500);
                } else if (res.redirect) {
                    setTimeout(() => window.location.href = res.redirect, 1500);
                } else {
                    setTimeout(() => window.location.href = '/login', 1500);
                }
            } else {
                let errorMsg = res.message;
                if (res.attemptsRemaining !== undefined) {
                    errorMsg += ` You have ${res.attemptsRemaining} attempts remaining.`;
                }
                UI.showNotification(errorMsg, 'error');
                
                if (res.message.includes('Maximum') || res.message.includes('expired')) {
                    document.getElementById('verifyBtn').disabled = true;
                }
                
                inputs.forEach(i => i.value = '');
                inputs[0].focus();
                inputs.forEach(i => { i.classList.add('error'); setTimeout(() => i.classList.remove('error'), 1500) });
            }
        });
        
        document.getElementById('resendLink').addEventListener('click', async (e) => {
            e.preventDefault();
            const challengeId = sessionStorage.getItem('challengeId');
            if (!challengeId) {
                UI.showNotification('Session expired. Please start over.', 'error');
                return;
            }

            const res = await api.post('/otp/resend', { challengeId });
            if (res.success) {
                time = 180; // Reset timer
                document.getElementById('verifyBtn').disabled = false;
                UI.showNotification('New code sent.', 'success');
            } else {
                UI.showNotification(res.message, 'error');
            }
        });
    }

    // -- MFA Setup Form --
    const mfaSetupForm = document.getElementById('mfaSetupForm');
    if (mfaSetupForm) {
        const options = document.querySelectorAll('.mfa-option');
        let selectedMethod = 'authenticator';

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedMethod = opt.getAttribute('data-method');
            });
        });

        document.getElementById('continueMfaBtn').addEventListener('click', () => {
            if (selectedMethod === 'authenticator') {
                document.getElementById('methodSelection').classList.add('hidden');
                document.getElementById('qrSetup').classList.remove('hidden');
            } else {
                saveMfaAndRedirect(selectedMethod);
            }
        });

        const finishMfaBtn = document.getElementById('finishMfaBtn');
        if (finishMfaBtn) {
            finishMfaBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/mfa-verify';
            });
        }

        mfaSetupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveMfaAndRedirect('authenticator');
        });

        async function saveMfaAndRedirect(method) {
            UI.showNotification('MFA setup complete. Please continue.', 'success');
            setTimeout(() => window.location.href = '/register-success', 1500);
        }
    }

    // -- MFA Verify Form --
    const mfaVerifyForm = document.getElementById('mfaVerifyForm');
    if (mfaVerifyForm) {
        setupOtpInputs('.otp-box');
        
        mfaVerifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            UI.showNotification('MFA Verified Successfully!', 'success');
            setTimeout(() => window.location.href = '/register-success', 1500);
        });
    }

    // -- Dashboard --
    const welcomeText = document.getElementById('welcomeText');
    if (welcomeText) {
        async function loadDashboard() {
            const res = await api.get('/me');
            if (res.success) {
                const user = res.user;
                welcomeText.textContent = `Welcome, ${user.fullName}`;
                
                const emailEl = document.getElementById('emailStatus');
                emailEl.innerHTML = user.emailVerified 
                    ? `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 4px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Verified` 
                    : 'Pending';
                emailEl.className = `dash-status ${user.emailVerified ? 'status-verified' : 'status-pending'}`;
                
                const mobileEl = document.getElementById('mobileStatus');
                mobileEl.innerHTML = user.mobileVerified 
                    ? `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 4px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Verified` 
                    : 'Pending';
                mobileEl.className = `dash-status ${user.mobileVerified ? 'status-verified' : 'status-pending'}`;

                document.getElementById('mfaStatus').textContent = (user.mfaMethod || 'Email').toUpperCase();
            } else {
                window.location.href = '/login';
            }
        }
        
        loadDashboard();

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await api.post('/logout', {});
            window.location.href = '/login';
        });

        document.getElementById('testJwtBtn').addEventListener('click', async () => {
            // First get token
            const tokenRes = await api.post('/token', {});
            if (tokenRes.success) {
                // Then test protected route
                const protectedRes = await api.get('/protected', tokenRes.token);
                if (protectedRes.success) {
                    const modal = document.getElementById('jwtModal');
                    if (modal) modal.style.display = 'flex';
                } else {
                    UI.showNotification(protectedRes.message, 'error');
                }
            }
        });

        const closeJwtBtn = document.getElementById('closeJwtBtn');
        if (closeJwtBtn) {
            closeJwtBtn.addEventListener('click', () => {
                document.getElementById('jwtModal').style.display = 'none';
            });
        }
    }
});
