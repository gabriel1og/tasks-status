"use client";

export type MockUser = {
  id: string;
  username: string;
  nome: string;
};

const inboundUser: MockUser = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "inbound",
  nome: "Inbound",
};

const mockSessionKey = "gerenciamento-status:mock-session";

export function getInboundUser() {
  return inboundUser;
}

export function isInboundSessionActive() {
  return window.localStorage.getItem(mockSessionKey) === inboundUser.username;
}

export function signInInbound(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();

  if (normalizedUsername !== inboundUser.username || password !== "inbound") {
    return { ok: false, message: "Usuario ou senha invalidos." };
  }

  window.localStorage.setItem(mockSessionKey, inboundUser.username);
  return { ok: true, message: "" };
}

export function signOutInbound() {
  window.localStorage.removeItem(mockSessionKey);
}
