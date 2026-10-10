import type { TaskDto } from './TaskDto.js'

export interface PublicTaskDto extends Pick<TaskDto, 'text'> {}
