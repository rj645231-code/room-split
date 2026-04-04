const API = 'http://localhost:5000/api';

async function request(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(API + endpoint, options);
  const data = await res.json();
  if (!res.ok) throw new Error(res.status + ' ' + res.statusText + ': ' + (data.message || JSON.stringify(data)));
  return data;
}

async function testFlow() {
  try {
    const ts = Date.now();
    
    // 1. Register User A (Admin)
    console.log('Registering User A...');
    const resA = await request('/auth/register', 'POST', { name: 'Admin Bob ' + ts, email: 'admin_' + ts + '@test.com', password: 'password123' });
    const tokenA = resA.token;
    const userA = resA.data;

    // 2. Register User B (Member)
    console.log('Registering User B...');
    const resB = await request('/auth/register', 'POST', { name: 'Member Sue ' + ts, email: 'sue_' + ts + '@test.com', password: 'password123' });
    const tokenB = resB.token;
    const userB = resB.data;

    // 3. User A creates group
    console.log('User A creating group...');
    const groupRes = await request('/groups', 'POST', { name: 'Test Group', currency: 'USD' }, tokenA);
    const groupId = groupRes.data._id;
    console.log('Created group: ' + groupId);

    // 4. Invite User B
    console.log('User A searching for Sue and inviting...');
    const searchRes = await request('/join-requests/users/search?q=Sue', 'GET', null, tokenA);
    console.log('Search results: ' + searchRes.data.length);
    await request('/groups/' + groupId + '/invite/' + userB._id, 'POST', null, tokenA);
    
    // 5. User B accepts invite
    console.log('User B checking invites...');
    const invitesRes = await request('/join-requests/invites/mine', 'GET', null, tokenB);
    const inviteId = invitesRes.data[0]._id;
    console.log('User B accepting invite: ' + inviteId);
    await request('/join-requests/invites/' + inviteId, 'PUT', { action: 'accept' }, tokenB);

    // 6. User B adds an expense
    console.log('User B adding an expense...');
    const expRes = await request('/expenses', 'POST', {
      group: groupId,
      paidBy: userB._id,
      title: 'Dinner',
      totalAmount: 100,
      items: [{ name: 'Dinner', totalCost: 100, consumers: [userA._id, userB._id] }]
    }, tokenB);
    console.log('Expense added, createdBy: ' + expRes.data.createdBy);

    // 7. User A attempts to delete expense (should work since User A is admin)
    console.log('User A (admin) deleting expense... (testing admin override)');
    await request('/expenses/' + expRes.data._id, 'DELETE', null, tokenA);
    console.log('Admin delete successful!');

    // 8. Re-add expense by User B
    const expRes2 = await request('/expenses', 'POST', {
      group: groupId,
      paidBy: userB._id,
      title: 'Lunch',
      totalAmount: 50,
      items: [{ name: 'Lunch', totalCost: 50, consumers: [userA._id, userB._id] }] // Each owes 25, A owes B 25
    }, tokenB);

    // 9. Suggest settlements
    const sugRes = await request('/settlements/suggest/' + groupId, 'GET', null, tokenB);
    const suggestions = sugRes.data.settlements;
    console.log('Suggested settlements: ' + suggestions.length);

    // 10. User A pays User B
    console.log('User A recording payment to User B...');
    const setRes = await request('/settlements', 'POST', {
      group: groupId,
      from: userA._id,
      to: userB._id,
      amount: 25,
      note: 'Here is the lunch money'
    }, tokenA);
    const settlementId = setRes.data._id;
    console.log('Settlement status: ' + setRes.data.status);

    // 11. User B confirms receipt
    console.log('User B confirming receipt...');
    const confirmRes = await request('/settlements/' + settlementId + '/confirm', 'PUT', null, tokenB);
    console.log('Final settlement status: ' + confirmRes.data.status);

    console.log('\\n✅ ALL TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFlow();
