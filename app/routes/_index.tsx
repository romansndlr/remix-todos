import {
  Form,
  json,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
} from '@remix-run/react'
import { PrismaClient } from '@prisma/client'
import { ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import React, { useRef } from 'react'

export async function loader() {
  const prisma = new PrismaClient()

  const todos = await prisma.todo.findMany()

  return json({ todos })
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()

  const todo = formData.get('todo')
  const method = formData.get('_method')
  const done = formData.get('done')
  const todoId = formData.get('todoId')

  const prisma = new PrismaClient()

  switch (method) {
    case 'POST':
      try {
        const CreateTodoSchema = z.object({
          title: z.string().min(1, { message: 'Title is required' }),
        })

        const validated = await CreateTodoSchema.parseAsync({ title: todo })

        await prisma.todo.create({
          data: {
            title: validated.title,
          },
        })

        return json(
          { success: true, errors: {} as Record<string, string[]> },
          { status: 201 }
        )
      } catch (error) {
        if (error instanceof z.ZodError) {
          return json(
            { success: false, errors: error.flatten().fieldErrors },
            { status: 422 }
          )
        }

        return json(
          { success: false, errors: {} as Record<string, string[]> },
          { status: 400 }
        )
      }
    case 'PATCH':
      try {
        // await sleep(3000)

        await prisma.todo.update({
          where: {
            id: Number(todoId),
          },
          data: {
            done: Boolean(done),
          },
        })

        return json(
          { success: true, errors: {} as Record<string, string[]> },
          { status: 201 }
        )
      } catch (error) {
        return json(
          { success: false, errors: {} as Record<string, string[]> },
          { status: 400 }
        )
      }
    default:
      throw new Error('Method not allowed')
  }
}

export default function Index() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigation = useNavigation()

  const fetcher = useFetcher()

  React.useEffect(() => {
    if (
      inputRef.current &&
      navigation.formMethod === 'POST' &&
      navigation.state === 'submitting'
    ) {
      inputRef.current.value = ''
    }
  }, [navigation.formMethod, navigation.state])

  return (
    <div className="p-6 bg-gray-800 rounded-xl shadow">
      <header>
        <Form className="flex items-end gap-x-2" method="POST">
          <input type="hidden" name="_method" value="POST" />
          <div className="flex flex-col flex-1">
            <label htmlFor="todo" className="font-medium">
              Todo
            </label>
            <div className="flex items-center gap-x-2 mt-1">
              <input
                ref={inputRef}
                name="todo"
                id="todo"
                className="px-3 bg-gray-600 py-2 rounded-lg flex-1"
              />
              <button className="bg-gray-200 font-semibold text-gray-900 py-2 px-5 rounded-lg">
                + Add
              </button>
            </div>
            {actionData?.errors?.title && (
              <small className="mt-1 text-red-500 text-sm">
                {actionData.errors?.title}
              </small>
            )}
          </div>
        </Form>
      </header>
      {loaderData.todos.length > 0 ? (
        <ul className="flex mt-6 flex-col divide-y divide-gray-500 border-t border-gray-500">
          {loaderData.todos.map((todo) => (
            <li
              key={todo.id}
              className="w-96 flex justify-between items-center py-3"
            >
              {todo.title}
              <input
                type="checkbox"
                defaultChecked={todo.done}
                onChange={(e) => {
                  const target = e.target as HTMLInputElement

                  const formData = new FormData()

                  formData.set('done', target.checked.toString())
                  formData.set('todoId', String(todo.id))
                  formData.set('_method', 'PATCH')

                  fetcher.submit(formData, { method: 'POST' })
                }}
                name="done"
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6">Add your first todo!</p>
      )}
    </div>
  )
}
