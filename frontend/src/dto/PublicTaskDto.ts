import type { TaskDto } from './TaskDto.ts'

export interface PublicTaskDto extends Pick<TaskDto, 'text'> {}
