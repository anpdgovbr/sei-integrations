import assert from "node:assert/strict"
import { test } from "node:test"
import { isPublished, publishAndWait, runPackages, tagAndRelease } from "./release-npmjs.mjs"

function npmError(code, message = "") {
  return Object.assign(new Error(message), {
    stdout: JSON.stringify({ error: { code } }),
    stderr: message,
    status: 1,
  })
}
const absent = () => {
  throw npmError("E404")
}
const options = { attempts: 3, delay: 0, wait: async () => {} }

test("somente E404 permite tratar uma versão como ausente", () => {
  assert.equal(
    isPublished("pkg", "1.0.4", () => '"1.0.4"'),
    true,
  )
  assert.equal(isPublished("pkg", "1.0.4", absent), false)
  for (const code of ["E401", "E403", "E500", "ETIMEDOUT", "ENOTFOUND"]) {
    assert.throws(() =>
      isPublished("pkg", "1.0.4", () => {
        throw npmError(code)
      }),
    )
  }
  assert.throws(() => isPublished("pkg", "1.0.4", () => ""))
  assert.throws(() => isPublished("pkg", "1.0.4", () => '"1.0.3"'))
})

test("publish aceito aguarda propagação antes de concluir", async () => {
  let queries = 0
  let publishes = 0
  await publishAndWait("pkg", "1.0.4", "pkg.tgz", {
    ...options,
    run: (_, args) => {
      if (args[0] === "publish") {
        publishes++
        return "+ pkg@1.0.4"
      }
      queries++
      if (queries < 3) {
        throw npmError(queries === 1 ? "ETIMEDOUT" : "E404")
      }
      return '"1.0.4"'
    },
  })
  assert.equal(publishes, 1)
  assert.equal(queries, 3)
})

test("E409 de staging aguarda a versão sem repetir o envio", async () => {
  let publishes = 0
  await publishAndWait("pkg", "1.0.4", "pkg.tgz", {
    ...options,
    run: (_, args) => {
      if (args[0] === "publish") {
        publishes++
        throw npmError(
          "E409",
          'npm error E409 Cannot publish over previously staged version "1.0.4".',
        )
      }
      return '"1.0.4"'
    },
  })
  assert.equal(publishes, 1)
})

test("staging não confirmado falha em vez de anunciar sucesso", async () => {
  await assert.rejects(
    publishAndWait("pkg", "1.0.4", "pkg.tgz", {
      ...options,
      run: (_, args) => (args[0] === "publish" ? "+ pkg@1.0.4" : absent()),
    }),
    /ainda não está disponível/,
  )
})

test("outros erros de publicação não são ignorados", async () => {
  for (const code of ["E403", "E409"]) {
    await assert.rejects(
      publishAndWait("pkg", "1.0.4", "pkg.tgz", {
        ...options,
        run: () => {
          throw npmError(code, "permission denied")
        },
      }),
      /Falha ao publicar/,
    )
  }
})

test("tenta os demais pacotes e reporta falha agregada ao final", async () => {
  const visited = []
  await assert.rejects(
    runPackages(["soap", "sei", "sip"], async (pkg) => {
      visited.push(pkg)
      if (pkg === "soap") {
        throw new Error("staging pendente")
      }
    }),
    AggregateError,
  )
  assert.deepEqual(visited, ["soap", "sei", "sip"])
})

test("tag e release existentes não são recriadas", () => {
  const calls = []
  tagAndRelease(
    "pkg",
    "1.0.4",
    "unused",
    (bin, args) => {
      calls.push([bin, ...args])
    },
    true,
  )
  assert.equal(
    calls.some(([, cmd]) => cmd === "tag" || cmd === "release"),
    false,
  )
})

test("recupera release ausente sem recriar tag existente", () => {
  const calls = []
  tagAndRelease(
    "pkg",
    "1.0.4",
    "unused",
    (bin, args) => {
      calls.push([bin, ...args])
      if (args[0] === "api") {
        throw Object.assign(new Error(), { stderr: "HTTP 404" })
      }
    },
    true,
  )
  assert.equal(
    calls.some(([, cmd]) => cmd === "tag"),
    false,
  )
  assert.equal(calls.filter(([, cmd]) => cmd === "release").length, 1)
})

test("cria tag ausente e falha ao consultar release sem autorização", () => {
  const calls = []
  assert.throws(
    () =>
      tagAndRelease(
        "pkg",
        "1.0.4",
        "unused",
        (bin, args) => {
          calls.push([bin, ...args])
          if (args[0] === "show-ref") {
            throw Object.assign(new Error(), { status: 1 })
          }
          if (args[0] === "api") {
            throw Object.assign(new Error("auth"), { stderr: "HTTP 401" })
          }
        },
        true,
      ),
    /auth/,
  )
  assert.equal(calls.filter(([, cmd]) => cmd === "tag").length, 1)
  assert.equal(
    calls.some(([, cmd]) => cmd === "release"),
    false,
  )
})
